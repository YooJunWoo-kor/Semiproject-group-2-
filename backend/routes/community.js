const express = require('express');
const db = require('../db');

const router = express.Router();

// API 주소로 게시판 번호와 기본 분류를 조회합니다.
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

// 게시판 설정을 찾은 뒤 글·댓글 처리 함수에 전달합니다.
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

    // [수정] 삭제되지 않은 원댓글과 대댓글만 개수에 포함합니다.
    const [posts] = await db.promise().execute(
        `SELECT p.*, e.name AS employee_name, e.email AS login_id,
                (SELECT COUNT(*)
                 FROM community_comments c
                 WHERE c.post_id = p.post_id
                   AND c.deleted_at IS NULL) AS comment_count
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

    // [수정] 삭제된 답글은 제외하고, 답글이 남은 원댓글은 안내 문구로 표시합니다.
    const [comments] = await db.promise().execute(
        `SELECT c.comment_id,
                c.post_id,
                c.parent_comment_id,
                c.deleted_at,
                CASE WHEN c.deleted_at IS NULL THEN c.content
                     ELSE '삭제된 댓글입니다' END AS content,
                CASE WHEN c.deleted_at IS NULL THEN c.employee_id END AS employee_id,
                CASE WHEN c.deleted_at IS NULL THEN e.name END AS employee_name,
                CASE WHEN c.deleted_at IS NULL THEN e.email END AS login_id,
                c.created_at,
                c.updated_at
         FROM community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         LEFT JOIN employees e ON c.employee_id = e.employee_id
         WHERE p.board_type = ?
           AND (
               c.deleted_at IS NULL
               OR (
                   c.parent_comment_id IS NULL
                   AND EXISTS (
                       SELECT 1
                       FROM community_comments reply
                       WHERE reply.parent_comment_id = c.comment_id
                         AND reply.post_id = c.post_id
                         AND reply.deleted_at IS NULL
                   )
               )
           )
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

// 기존 주소에 맞춰 댓글 번호와 게시글 번호를 확인합니다.
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

    // [수정] 삭제된 댓글은 수정 대상에서 제외합니다.
    const [result] = await db.promise().execute(
        `UPDATE community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         SET c.content = ?, c.updated_at = CURRENT_TIMESTAMP
         WHERE ${target.condition} AND c.deleted_at IS NULL`,
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

    // [수정] 댓글의 삭제 시각을 기록하고 기존 수정 시각은 유지합니다.
    const [result] = await db.promise().execute(
        `UPDATE community_comments c
         JOIN community_posts p ON c.post_id = p.post_id
         SET c.deleted_at = CURRENT_TIMESTAMP,
             c.updated_at = c.updated_at
         WHERE ${target.condition} AND c.deleted_at IS NULL`,
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

// 일반 댓글과 대댓글 등록
router.post('/:boardPath/:postId/comments', withBoard(async (req, res, board) => {
    const { postId } = req.params;
    const { content, employee_id, parent_comment_id = null } = req.body ?? {};

    if (!validId(postId) ||
        !validId(employee_id) ||
        !validText(content, 10000)) {
        return badRequest(res, '게시글 번호, 댓글 내용과 작성 직원 번호를 확인해 주세요.');
    }

    const isReply = parent_comment_id !== null;

    if (isReply && !validId(parent_comment_id)) {
        return badRequest(res, '원댓글 번호를 확인해 주세요.');
    }

    // 답글은 같은 글에 속한 삭제되지 않은 원댓글 아래에만 저장합니다.
    const [result] = await db.promise().execute(
        `INSERT INTO community_comments
            (post_id, content, employee_id, parent_comment_id)
         SELECT p.post_id, ?, ?, ?
         FROM community_posts p
         WHERE p.post_id = ? AND p.board_type = ?
           AND (
               ? IS NULL OR EXISTS (
                   SELECT 1
                   FROM community_comments AS parent
                   WHERE parent.comment_id = ?
                     AND parent.post_id = p.post_id
                     AND parent.parent_comment_id IS NULL
                     AND parent.deleted_at IS NULL
               )
           )`,
        [
            content.trim(),
            employee_id,
            parent_comment_id,
            postId,
            board.type,
            parent_comment_id,
            parent_comment_id
        ]
    );

    if (!result.affectedRows) {
        return notFound(
            res,
            isReply
                ? '게시글 또는 답글을 달 수 있는 원댓글을 찾을 수 없습니다.'
                : '게시글을 찾을 수 없습니다.'
        );
    }

    res.status(201).json({
        comment_id: result.insertId,
        message: '댓글이 등록되었습니다.'
    });
}));

router.put('/:boardPath/:postId/comments/:commentId', withBoard(updateComment));
router.delete('/:boardPath/:postId/comments/:commentId', withBoard(deleteComment));

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