const express = require('express');
const db = require('../db');
const router = express.Router();

// [유지] 직원 조회 API
router.get('/employee', async (req, res) => {
    if (!req.query.email) return res.status(400).json({
        message: '이메일이 필요합니다.'
    });
    try {
        const [rows] = await db.promise().query('SELECT employee_id, name, email FROM employees WHERE email = ? LIMIT 1', [req.query.email]);
        if (!rows.length) return res.status(404).json({
            message: '직원 정보를 찾을 수 없습니다.'
        });
        res.json(rows[0]);
    } catch (error) {
        fail(res, error);
    }
});

// [수정] 실제 DB 컬럼명으로 조회·저장합니다. 이름은 employees에서 조회합니다.
// 테이블명과 컬럼명은 아래 고정 설정만 사용하며 사용자 입력으로 만들지 않습니다.
const boards = [{
    path: '/free-posts',
    table: 'free',
    id: 'post_id',
    title: 'post_title',
    body: 'post_content',
    comment: 'fr_cmt_id'
}, {
    path: '/notices',
    table: 'notice',
    id: 'nt_id',
    title: 'nt_title',
    body: 'nt_content',
    comment: 'nt_cmt_id',
    category: '일반공지',
    notice: true
}, {
    path: '/tech-library',
    table: 'techlibrary',
    id: 'tl_id',
    title: 'tl_title',
    body: 'tl_content',
    comment: 'tl_cmt_id',
    category: '기타'
}, {
    path: '/qna',
    table: 'qna',
    id: 'qa_id',
    title: 'qa_title',
    body: 'qa_content',
    comment: 'qa_cmt_id',
    category: '질문'
}, {
    path: '/suggestions',
    table: 'suggestion',
    id: 'sg_id',
    title: 'sg_title',
    body: 'sg_content',
    comment: 'sg_cmt_id',
    category: '건의'
}];
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
function fail(res, error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({
        message: '직원 또는 게시글 정보를 확인해 주세요.'
    });
    console.error('커뮤니티 처리 오류:', error.message);
    return res.status(500).json({
        message: '게시판 처리에 실패했습니다.',
        error: error.message
    });
}
const handler = action => async (req, res) => {
    try {
        await action(req, res);
    } catch (error) {
        fail(res, error);
    }
};
for (const b of boards) {
    const posts = b.table + '_posts',
        comments = b.table + '_comments';
    const order = b.notice ? 'p.important DESC, ' : '';
    // [수정] LEFT JOIN이므로 직원이 삭제되어도 게시글·댓글은 남습니다.
    router.get(b.path, handler(async (req, res) => {
        const [rows] = await db.promise().query(`SELECT p.*, e.name AS employee_name FROM ${posts} p LEFT JOIN employees e ON p.employee_id = e.employee_id ORDER BY ${order}p.created_at DESC, p.${b.id} DESC`);
        const [replies] = await db.promise().query(`SELECT c.*, e.name AS employee_name FROM ${comments} c LEFT JOIN employees e ON c.employee_id = e.employee_id ORDER BY c.created_at, c.${b.comment}`);
        const grouped = new Map();
        for (const c of replies) {
            if (!grouped.has(c[b.id])) grouped.set(c[b.id], []);
            grouped.get(c[b.id]).push(c);
        }
        res.json(rows.map(p => ({
            ...p,
            comments: grouped.get(p[b.id]) || []
        })));
    }));
    const postInput = req => {
        const body = req.body || {};
        if (!validText(body[b.title], 200) || !validText(body[b.body], 1000000)) return null;
        if (b.table === 'free' && Buffer.byteLength(body[b.body].trim(), 'utf8') > 65535) return null;
        const values = [body[b.title].trim(), body[b.body].trim()];
        if (b.category) {
            const category = body.category ?? b.category;
            if (!validText(category, 100)) return null;
            if (b.notice && !['일반공지', '중요공지'].includes(category)) return null;
            values.push(category.trim());
            if (b.notice) values.push(category === '중요공지' ? 1 : 0);
        }
        return values;
    };
    const columns = [b.title, b.body, ...(b.category ? ['category'] : []), ...(b.notice ? ['important'] : [])];
    router.post(b.path, handler(async (req, res) => {
        const values = postInput(req);
        if (!values || !validId(req.body?.employee_id)) return res.status(400).json({
            message: '제목·내용·분류와 로그인 직원 번호를 확인해 주세요.'
        });
        const [result] = await db.promise().query(`INSERT INTO ${posts} (${columns.join(',')}, employee_id) VALUES (${[...values, req.body.employee_id].map(() => '?').join(',')})`, [...values, req.body.employee_id]);
        res.status(201).json({
            [b.id]: result.insertId,
            message: '등록되었습니다.'
        });
    }));
    router.put(b.path + '/:postId', handler(async (req, res) => {
        const values = postInput(req);
        if (!validId(req.params.postId) || !values) return res.status(400).json({
            message: '게시글 번호와 입력 내용을 확인해 주세요.'
        });
        // [수정] 글을 수정해도 최초 작성 직원은 변경하지 않습니다.
        const [result] = await db.promise().query(`UPDATE ${posts} SET ${columns.map(c => c + ' = ?').join(',')} WHERE ${b.id} = ?`, [...values, req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({
            message: '게시글을 찾을 수 없습니다.'
        });
        res.json({
            message: '수정되었습니다.'
        });
    }));
    router.delete(b.path + '/:postId', handler(async (req, res) => {
        if (!validId(req.params.postId)) return res.status(400).json({
            message: '게시글 번호를 확인해 주세요.'
        });
        // 댓글은 DB 외래키 ON DELETE CASCADE로 함께 삭제됩니다.
        const [result] = await db.promise().query(`DELETE FROM ${posts} WHERE ${b.id} = ?`, [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({
            message: '게시글을 찾을 수 없습니다.'
        });
        res.json({
            message: '삭제되었습니다.'
        });
    }));

    // [추가] 상세 열기 요청에서만 조회수 증가. 수정일시는 유지합니다.
    if (b.notice) router.post(b.path + '/:postId/view', handler(async (req, res) => {
        if (!validId(req.params.postId)) return res.status(400).json({
            message: '게시글 번호를 확인해 주세요.'
        });
        const [result] = await db.promise().query(`UPDATE ${posts} SET views = views + 1, updated_at = updated_at WHERE ${b.id} = ?`, [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({
            message: '게시글을 찾을 수 없습니다.'
        });
        const [rows] = await db.promise().query(`SELECT views FROM ${posts} WHERE ${b.id} = ?`, [req.params.postId]);
        res.json({
            views: rows[0]?.views ?? 0
        });
    }));
    router.post(b.path + '/:postId/comments', handler(async (req, res) => {
        if (!validId(req.params.postId) || !validId(req.body?.employee_id) || !validText(req.body?.content, 10000)) return res.status(400).json({
            message: '댓글 내용과 직원 번호를 확인해 주세요.'
        });
        const [result] = await db.promise().query(`INSERT INTO ${comments} (${b.id}, content, employee_id) VALUES (?, ?, ?)`, [req.params.postId, req.body.content.trim(), req.body.employee_id]);
        res.status(201).json({
            [b.comment]: result.insertId,
            message: '댓글이 등록되었습니다.'
        });
    }));
    // [유지] 자유게시판 댓글 URL은 기존 /comments/:commentId를 유지합니다.
    const commentPath = b.table === 'free' ? '/comments/:commentId' : b.path + '/:postId/comments/:commentId';
    const commentWhere = `${b.comment} = ?` + (b.table === 'free' ? '' : ` AND ${b.id} = ?`);
    const commentIds = req => b.table === 'free' ? [req.params.commentId] : [req.params.commentId, req.params.postId];
    router.put(commentPath, handler(async (req, res) => {
        if (!commentIds(req).every(validId) || !validText(req.body?.content, 10000)) return res.status(400).json({
            message: '댓글 번호와 내용을 확인해 주세요.'
        });
        const [result] = await db.promise().query(`UPDATE ${comments} SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE ${commentWhere}`, [req.body.content.trim(), ...commentIds(req)]);
        if (!result.affectedRows) return res.status(404).json({
            message: '댓글을 찾을 수 없습니다.'
        });
        res.json({
            message: '댓글이 수정되었습니다.'
        });
    }));
    router.delete(commentPath, handler(async (req, res) => {
        if (!commentIds(req).every(validId)) return res.status(400).json({
            message: '댓글 번호를 확인해 주세요.'
        });
        const [result] = await db.promise().query(`DELETE FROM ${comments} WHERE ${commentWhere}`, commentIds(req));
        if (!result.affectedRows) return res.status(404).json({
            message: '댓글을 찾을 수 없습니다.'
        });
        res.json({
            message: '댓글이 삭제되었습니다.'
        });
    }));
}

// [삭제] 업무자료실 첨부파일 API는 사용하지 않습니다.
module.exports = router;
