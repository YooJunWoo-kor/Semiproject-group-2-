const express = require('express');
const db = require('../db');

const router = express.Router();

// 기존 API 주소를 유지하고, 저장할 때 게시판 번호로 구분합니다.
const boards = [
    { path: '/free-posts', type: '1', category: null },
    { path: '/notices', type: '2', category: '일반공지' },
    { path: '/tech-library', type: '3', category: '기타' },
    { path: '/qna', type: '4', category: '질문' },
    { path: '/suggestions', type: '5', category: '건의' },
];

function validId(value) {
    return (typeof value === 'string' || typeof value === 'number') &&
        /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647;
}

function validText(value, limit) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= limit;
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
            return res.status(500).json({ message: '게시판 처리에 실패했습니다.' });
        }
    };
}

router.get('/employee', handle(async (req, res) => {
    const { email } = req.query;
    if (!validText(email, 255)) return badRequest(res, '이메일이 필요합니다.');

    const [rows] = await db.promise().execute(
        'SELECT employee_id, name, email FROM employees WHERE email = ? LIMIT 1',
        [email.trim()]
    );

    if (!rows.length) return notFound(res, '직원 정보를 찾을 수 없습니다.');
    res.json(rows[0]);
}));

// [추가] 통합게시판에 표시할 글과 댓글 수를 조회합니다.
router.get('/posts', handle(async (req, res) => {
    const boardType = req.query.board_type;
    if (boardType !== undefined && !boards.some(board => board.type === boardType)) {
        return badRequest(res, '게시판 구분을 확인해 주세요.');
    }

    const conditions = boardType === undefined ? '' : 'WHERE p.board_type = ?';
    const params = boardType === undefined ? [] : [boardType];
    const [posts] = await db.promise().execute(
        `SELECT p.*, e.name AS employee_name, e.email AS login_id,
                (SELECT COUNT(*) FROM community_comments c
                 WHERE c.post_id = p.post_id) AS comment_count
         FROM community_posts p
         LEFT JOIN employees e ON p.employee_id = e.employee_id
         ${conditions}
         ORDER BY p.created_at DESC, p.post_id DESC`,
        params
    );

    res.json(posts);
}));

// [수정] 게시판별 글 조회는 두 공통 테이블을 사용합니다.
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

    return posts.map(post => ({ ...post, comments: byPost.get(post.post_id) || [] }));
}

function readPost(body, board) {
    if (!validText(body?.title, 200) || !validText(body?.content, 1000000)) return null;

    let category = null;
    if (board.category !== null) {
        const value = body.category ?? board.category;
        if (!validText(value, 100)) return null;
        category = value.trim();
    }

    if (board.type === '2' && !['일반공지', '중요공지'].includes(category)) return null;

    return [body.title.trim(), body.content.trim(), category, board.type === '2' && category === '중요공지' ? 1 : 0];
}

for (const board of boards) {
    router.get(board.path, handle(async (req, res) => {
        res.json(await loadBoard(board));
    }));

    router.post(board.path, handle(async (req, res) => {
        const values = readPost(req.body, board);
        if (!values || !validId(req.body?.employee_id)) {
            return badRequest(res, '제목, 본문, 분류와 작성 직원 번호를 확인해 주세요.');
        }

        const [result] = await db.promise().execute(
            `INSERT INTO community_posts (title, content, category, important, board_type, employee_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [...values, board.type, req.body.employee_id]
        );
        res.status(201).json({ post_id: result.insertId, message: '게시글이 등록되었습니다.' });
    }));

    router.put(board.path + '/:postId', handle(async (req, res) => {
        const values = readPost(req.body, board);
        if (!validId(req.params.postId) || !values) {
            return badRequest(res, '게시글 번호와 입력 내용을 확인해 주세요.');
        }

        const [result] = await db.promise().execute(
            `UPDATE community_posts SET title = ?, content = ?, category = ?, important = ?
             WHERE post_id = ? AND board_type = ?`,
            [...values, req.params.postId, board.type]
        );
        if (!result.affectedRows) return notFound(res, '게시글을 찾을 수 없습니다.');
        res.json({ message: '게시글이 수정되었습니다.' });
    }));

    router.delete(board.path + '/:postId', handle(async (req, res) => {
        if (!validId(req.params.postId)) return badRequest(res, '게시글 번호를 확인해 주세요.');

        // 연결된 댓글은 DB 외래키로 함께 삭제됩니다.
        const [result] = await db.promise().execute(
            'DELETE FROM community_posts WHERE post_id = ? AND board_type = ?',
            [req.params.postId, board.type]
        );
        if (!result.affectedRows) return notFound(res, '게시글을 찾을 수 없습니다.');
        res.json({ message: '게시글이 삭제되었습니다.' });
    }));

    router.post(board.path + '/:postId/comments', handle(async (req, res) => {
        if (!validId(req.params.postId) || !validId(req.body?.employee_id) || !validText(req.body?.content, 10000)) {
            return badRequest(res, '게시글 번호, 댓글 내용과 작성 직원 번호를 확인해 주세요.');
        }

        const [result] = await db.promise().execute(
            `INSERT INTO community_comments (post_id, content, employee_id)
             SELECT post_id, ?, ? FROM community_posts WHERE post_id = ? AND board_type = ?`,
            [req.body.content.trim(), req.body.employee_id, req.params.postId, board.type]
        );
        if (!result.affectedRows) return notFound(res, '게시글을 찾을 수 없습니다.');
        res.status(201).json({ comment_id: result.insertId, message: '댓글이 등록되었습니다.' });
    }));

    const isFree = board.type === '1';
    const commentPath = isFree ? '/comments/:commentId' : board.path + '/:postId/comments/:commentId';
    const commentCondition = 'c.comment_id = ? AND p.board_type = ?' + (isFree ? '' : ' AND p.post_id = ?');
    const commentParams = req => isFree
        ? [req.params.commentId, board.type]
        : [req.params.commentId, board.type, req.params.postId];
    const validCommentRoute = req => validId(req.params.commentId) && (isFree || validId(req.params.postId));

    router.put(commentPath, handle(async (req, res) => {
        if (!validCommentRoute(req) || !validText(req.body?.content, 10000)) {
            return badRequest(res, '댓글 번호와 내용을 확인해 주세요.');
        }

        const [result] = await db.promise().execute(
            `UPDATE community_comments c JOIN community_posts p ON c.post_id = p.post_id
             SET c.content = ?, c.updated_at = CURRENT_TIMESTAMP WHERE ${commentCondition}`,
            [req.body.content.trim(), ...commentParams(req)]
        );
        if (!result.affectedRows) return notFound(res, '댓글을 찾을 수 없습니다.');
        res.json({ message: '댓글이 수정되었습니다.' });
    }));

    router.delete(commentPath, handle(async (req, res) => {
        if (!validCommentRoute(req)) return badRequest(res, '댓글 번호를 확인해 주세요.');

        const [result] = await db.promise().execute(
            `DELETE c FROM community_comments c JOIN community_posts p ON c.post_id = p.post_id
             WHERE ${commentCondition}`,
            commentParams(req)
        );
        if (!result.affectedRows) return notFound(res, '댓글을 찾을 수 없습니다.');
        res.json({ message: '댓글이 삭제되었습니다.' });
    }));
}

// 조회수 증가가 게시글의 수정일시를 바꾸지 않도록 합니다.
router.post('/notices/:postId/view', handle(async (req, res) => {
    if (!validId(req.params.postId)) return badRequest(res, '게시글 번호를 확인해 주세요.');

    const [result] = await db.promise().execute(
        "UPDATE community_posts SET views = views + 1, updated_at = updated_at WHERE post_id = ? AND board_type = '2'",
        [req.params.postId]
    );
    if (!result.affectedRows) return notFound(res, '공지사항을 찾을 수 없습니다.');

    const [[post]] = await db.promise().execute(
        "SELECT views FROM community_posts WHERE post_id = ? AND board_type = '2'",
        [req.params.postId]
    );
    if (!post) return notFound(res, '공지사항을 찾을 수 없습니다.');
    res.json({ views: post.views });
}));

module.exports = router;