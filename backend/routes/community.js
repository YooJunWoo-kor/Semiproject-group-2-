const express = require('express');
const db = require('../db');

const router = express.Router();

// [추가] API 주소로 게시판 번호와 기본 분류를 조회합니다.
async function findBoard(apiPath) {
    const [rows] = await db.promise().execute(
        `SELECT board_type AS type, default_category AS category
         FROM community_boards
         WHERE api_path = ?`,
        [apiPath]
    );

    return rows[0] ?? null;
}

function validId(value) {
    return (typeof value === 'string' || typeof value === 'number') &&
        /^\d+$/.test(String(value)) &&
        Number(value) > 0 &&
        Number(value) <= 2147483647;
}

function validText(value, limit) {
    return typeof value === 'string' &&
        value.trim().length > 0 &&
        value.trim().length <= limit;
}

function badRequest(res, message) {
    return res.status(400).json({ message });
}

function notFound(res, message) {
    return res.status(404).json({ message });
}

function handle(action) {
    return async (req, res) => {
        try {
            await action(req, res);
        } catch (error) {
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return badRequest(res, '작성 직원 정보를 확인해 주세요.');
            }

            console.error('커뮤니티 처리 오류:', error.message);
            return res.status(500).json({
                message: '게시판 처리에 실패했습니다.'
            });
        }
    };
}

// [추가] 게시판 설정을 찾은 뒤 글·댓글 처리 함수에 전달합니다.
function withBoard(action, fixedPath) {
    return handle(async (req, res) => {
        const apiPath = fixedPath ?? `/${req.params.boardPath}`;
        const board = await findBoard(apiPath);

        if (!board) {
            return notFound(res, '게시판을 찾을 수 없습니다.');
        }

        await action(req, res, board);
    });
}

router.get('/employee', handle(async (req, res) => {
    const { email } = req.query;

    if (!validText(email, 255)) {
        return badRequest(res, '이메일이 필요합니다.');
    }

    const [rows] = await db.promise().execute(
        'SELECT employee_id, name, email FROM employees WHERE email = ? LIMIT 1',
        [email.trim()]
    );

    if (!rows.length) {
        return notFound(res, '직원 정보를 찾을 수 없습니다.');
    }

    res.json(rows[0]);
}));

// 고정 주소인 /posts는 /:boardPath보다 먼저 등록합니다.
router.get('/posts', handle(async (req, res) => {
    const boardType = req.query.board_type;

    // [수정] 게시판 번호가 전달되면 설정 테이블에서 확인합니다.
    if (boardType !== undefined) {
        if (typeof boardType !== 'string') {
            return badRequest(res, '게시판 구분을 확인해 주세요.');
        }

        const [rows] = await db.promise().execute(
            'SELECT board_type FROM community_boards WHERE board_type = ?',
            [boardType]
        );

        if (!rows.length) {
            return badRequest(res, '게시판 구분을 확인해 주세요.');
        }
    }

    const conditions = boardType === undefined ? '' : 'WHERE p.board_type = ?';
    const params = boardType === undefined ? [] : [boardType];

    const [posts] = await db.promise().execute(
        `SELECT p.*, e.name AS employee_name, e.email AS login_id,
                (SELECT COUNT(*)
                 FROM community_comments c
                 WHERE c.post_id = p.post_id) AS comment_count
         FROM community_posts p
         LEFT JOIN employees e ON p.employee_id = e.employee_id
         ${conditions}
         ORDER BY p.created_at DESC, p.post_id DESC`,
        params
    );

    res.json(posts);
}));

async function loadBoard(board) {
    const order = board.type === '2' ? 'p.important DESC, ' : '';

    const [posts] = await db.promise().execute(
        `SELECT p.*, e.name AS employee_name, e.email AS login_id
         FROM community_posts p
         LEFT JOIN employees e ON p.employee_id = e.employee_id
         WHERE p.board_type = ?
         ORDER BY ${order}p.created_at DESC, p.post_id DESC`,
        [board.type]
    );

    const [comments] = await db.promise().execute(
        `SELECT c.*, e.name AS employee_name, e.email AS login_id
         FROM community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         LEFT JOIN employees e ON c.employee_id = e.employee_id
         WHERE p.board_type = ?
         ORDER BY c.created_at, c.comment_id`,
        [board.type]
    );

    const byPost = new Map();

    for (const comment of comments) {
        const list = byPost.get(comment.post_id) || [];
        list.push(comment);
        byPost.set(comment.post_id, list);
    }

    return posts.map(post => ({
        ...post,
        comments: byPost.get(post.post_id) || []
    }));
}

function readPost(body, board) {
    if (!validText(body?.title, 200) || !validText(body?.content, 1000000)) {
        return null;
    }

    let category = null;

    if (board.category !== null) {
        const value = body.category ?? board.category;

        if (!validText(value, 100)) {
            return null;
        }

        category = value.trim();
    }

    if (board.type === '2' && !['일반공지', '중요공지'].includes(category)) {
        return null;
    }

    const important = board.type === '2' && category === '중요공지' ? 1 : 0;

    return [body.title.trim(), body.content.trim(), category, important];
}

// [수정] 기존 주소에 맞춰 댓글 번호와 게시글 번호를 확인합니다.
function commentTarget(req, board) {
    const { commentId, postId } = req.params;

    if (!validId(commentId)) {
        return null;
    }

    // 자유게시판의 기존 댓글 수정·삭제 주소에는 postId가 없습니다.
    if (postId === undefined) {
        return {
            condition: 'c.comment_id = ? AND p.board_type = ?',
            params: [commentId, board.type]
        };
    }

    if (!validId(postId) || board.type === '1') {
        return null;
    }

    return {
        condition: 'c.comment_id = ? AND p.board_type = ? AND p.post_id = ?',
        params: [commentId, board.type, postId]
    };
}

async function updateComment(req, res, board) {
    const target = commentTarget(req, board);

    if (!target || !validText(req.body?.content, 10000)) {
        return badRequest(res, '댓글 번호와 내용을 확인해 주세요.');
    }

    const [result] = await db.promise().execute(
        `UPDATE community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         SET c.content = ?, c.updated_at = CURRENT_TIMESTAMP
         WHERE ${target.condition}`,
        [req.body.content.trim(), ...target.params]
    );

    if (!result.affectedRows) {
        return notFound(res, '댓글을 찾을 수 없습니다.');
    }

    res.json({ message: '댓글이 수정되었습니다.' });
}

async function deleteComment(req, res, board) {
    const target = commentTarget(req, board);

    if (!target) {
        return badRequest(res, '댓글 번호를 확인해 주세요.');
    }

    const [result] = await db.promise().execute(
        `DELETE c FROM community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         WHERE ${target.condition}`,
        target.params
    );

    if (!result.affectedRows) {
        return notFound(res, '댓글을 찾을 수 없습니다.');
    }

    res.json({ message: '댓글이 삭제되었습니다.' });
}

// 자유게시판 댓글 주소는 /:boardPath/:postId보다 먼저 등록합니다.
router.put('/comments/:commentId', withBoard(updateComment, '/free-posts'));
router.delete('/comments/:commentId', withBoard(deleteComment, '/free-posts'));

// [수정] 각 요청의 주소로 DB 설정을 찾습니다.
router.get('/:boardPath', withBoard(async (req, res, board) => {
    res.json(await loadBoard(board));
}));

router.post('/:boardPath', withBoard(async (req, res, board) => {
    const values = readPost(req.body, board);

    if (!values || !validId(req.body?.employee_id)) {
        return badRequest(res, '제목, 본문, 분류와 작성 직원 번호를 확인해 주세요.');
    }

    const [result] = await db.promise().execute(
        `INSERT INTO community_posts (title, content, category, important, board_type, employee_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [...values, board.type, req.body.employee_id]
    );

    res.status(201).json({
        post_id: result.insertId,
        message: '게시글이 등록되었습니다.'
    });
}));

router.put('/:boardPath/:postId', withBoard(async (req, res, board) => {
    const values = readPost(req.body, board);

    if (!validId(req.params.postId) || !values) {
        return badRequest(res, '게시글 번호와 입력 내용을 확인해 주세요.');
    }

    const [result] = await db.promise().execute(
        `UPDATE community_posts
         SET title = ?, content = ?, category = ?, important = ?
         WHERE post_id = ? AND board_type = ?`,
        [...values, req.params.postId, board.type]
    );

    if (!result.affectedRows) {
        return notFound(res, '게시글을 찾을 수 없습니다.');
    }

    res.json({ message: '게시글이 수정되었습니다.' });
}));

router.delete('/:boardPath/:postId', withBoard(async (req, res, board) => {
    if (!validId(req.params.postId)) {
        return badRequest(res, '게시글 번호를 확인해 주세요.');
    }

    // 연결된 댓글은 기존 DB 외래키로 함께 삭제됩니다.
    const [result] = await db.promise().execute(
        'DELETE FROM community_posts WHERE post_id = ? AND board_type = ?',
        [req.params.postId, board.type]
    );

    if (!result.affectedRows) {
        return notFound(res, '게시글을 찾을 수 없습니다.');
    }

    res.json({ message: '게시글이 삭제되었습니다.' });
}));

router.post('/:boardPath/:postId/comments', withBoard(async (req, res, board) => {
    const { postId } = req.params;

    if (!validId(postId) ||
        !validId(req.body?.employee_id) ||
        !validText(req.body?.content, 10000)) {
        return badRequest(res, '게시글 번호, 댓글 내용과 작성 직원 번호를 확인해 주세요.');
    }

    const [result] = await db.promise().execute(
        `INSERT INTO community_comments (post_id, content, employee_id)
         SELECT post_id, ?, ?
         FROM community_posts
         WHERE post_id = ? AND board_type = ?`,
        [req.body.content.trim(), req.body.employee_id, postId, board.type]
    );

    if (!result.affectedRows) {
        return notFound(res, '게시글을 찾을 수 없습니다.');
    }

    res.status(201).json({
        comment_id: result.insertId,
        message: '댓글이 등록되었습니다.'
    });
}));

router.put('/:boardPath/:postId/comments/:commentId', withBoard(updateComment));
router.delete('/:boardPath/:postId/comments/:commentId', withBoard(deleteComment));

// [수정] 공지사항 조회수에도 DB에서 찾은 게시판 번호를 사용합니다.
router.post('/notices/:postId/view', withBoard(async (req, res, board) => {
    const { postId } = req.params;

    if (!validId(postId)) {
        return badRequest(res, '게시글 번호를 확인해 주세요.');
    }

    // 조회수를 올려도 게시글 수정일은 그대로 유지합니다.
    const [result] = await db.promise().execute(
        `UPDATE community_posts
         SET views = views + 1, updated_at = updated_at
         WHERE post_id = ? AND board_type = ?`,
        [postId, board.type]
    );

    if (!result.affectedRows) {
        return notFound(res, '공지사항을 찾을 수 없습니다.');
    }

    const [[post]] = await db.promise().execute(
        'SELECT views FROM community_posts WHERE post_id = ? AND board_type = ?',
        [postId, board.type]
    );

    if (!post) {
        return notFound(res, '공지사항을 찾을 수 없습니다.');
    }

    res.json({ views: post.views });
}, '/notices'));

module.exports = router;