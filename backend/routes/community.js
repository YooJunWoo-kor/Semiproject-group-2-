
const express = require('express');
const db = require('../db');

const router = express.Router();

// 1. 직원 정보 조회
router.get('/employee', async (req, res) => {

    const { email } = req.query;

    if (!email) {
        return res.status(400).json({
            message: '이메일이 필요합니다.'
        });
    }

    try {

        const [rows] = await db.promise().query(
            `SELECT employee_id, name, email
             FROM employees
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: '직원 정보를 찾을 수 없습니다.'
            });
        }

        res.json(rows[0]);

    } catch (error) {

        console.error('직원 정보 조회 오류:', error);

        res.status(500).json({
            message: '직원 정보 조회 실패',
            error: error.message
        });

    }

});


// ==========================================
// 2. 게시글 전체 조회
// ==========================================

router.get('/free-posts', async (req, res) => {

    try {

        // 게시글 조회
        const [posts] = await db.promise().query(
            `SELECT
                id,
                title,
                content,
                author,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt,
                DATE_FORMAT(updated_at, '%Y-%m-%d') AS updatedAt
             FROM test_free_posts
             ORDER BY created_at DESC`
        );


        // 댓글 전체 조회
        const [comments] = await db.promise().query(
            `SELECT
                id,
                post_id,
                content,
                author,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt
             FROM test_free_comments
             ORDER BY created_at ASC`
        );


        // 게시글마다 해당 댓글 연결
        const result = posts.map((post) => {

            return {
                ...post,

                comments: comments.filter(
                    (comment) => comment.post_id === post.id
                )

            };

        });


        res.json(result);

    } catch (error) {

        console.error('게시글 조회 오류:', error);

        res.status(500).json({
            message: '게시글 조회 실패',
            error: error.message
        });

    }

});


// ==========================================
// 3. 게시글 등록
// ==========================================

router.post('/free-posts', async (req, res) => {

    const { title, content, author } = req.body;

    if (!title || !content || !author) {
        return res.status(400).json({
            message: '제목, 내용, 작성자는 필수입니다.'
        });
    }

    try {

        const [result] = await db.promise().query(
            `INSERT INTO test_free_posts
            (title, content, author)
            VALUES (?, ?, ?)`,
            [title, content, author]
        );

        res.status(201).json({
            message: '게시글 등록 성공',
            id: result.insertId
        });

    } catch (error) {

        console.error('게시글 등록 오류:', error);

        res.status(500).json({
            message: '게시글 등록 실패',
            error: error.message
        });

    }

});


// ==========================================
// 4. 게시글 수정
// ==========================================

router.put('/free-posts/:id', async (req, res) => {

    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            message: '제목과 내용은 필수입니다.'
        });
    }

    try {

        const [result] = await db.promise().query(
            `UPDATE test_free_posts
             SET title = ?, content = ?
             WHERE id = ?`,
            [title, content, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        res.json({
            message: '게시글 수정 성공'
        });

    } catch (error) {

        console.error('게시글 수정 오류:', error);

        res.status(500).json({
            message: '게시글 수정 실패',
            error: error.message
        });

    }

});


// ==========================================
// 5. 게시글 삭제
// ==========================================

router.delete('/free-posts/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const [result] = await db.promise().query(
            'DELETE FROM test_free_posts WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        res.json({
            message: '게시글 삭제 성공'
        });

    } catch (error) {

        console.error('게시글 삭제 오류:', error);

        res.status(500).json({
            message: '게시글 삭제 실패',
            error: error.message
        });

    }

});


// ==========================================
// 6. 댓글 등록
// ==========================================

router.post('/free-posts/:postId/comments', async (req, res) => {

    const { postId } = req.params;
    const { content, author } = req.body;

    if (!content || !author) {
        return res.status(400).json({
            message: '댓글 내용과 작성자는 필수입니다.'
        });
    }

    try {

        const [result] = await db.promise().query(
            `INSERT INTO test_free_comments
            (post_id, content, author)
            VALUES (?, ?, ?)`,
            [postId, content, author]
        );

        res.status(201).json({
            message: '댓글 등록 성공',
            id: result.insertId
        });

    } catch (error) {

        console.error('댓글 등록 오류:', error);

        res.status(500).json({
            message: '댓글 등록 실패',
            error: error.message
        });

    }

});


// ==========================================
// 7. 댓글 삭제
// ==========================================

router.delete('/comments/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const [result] = await db.promise().query(
            'DELETE FROM test_free_comments WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: '댓글을 찾을 수 없습니다.'
            });
        }

        res.json({
            message: '댓글 삭제 성공'
        });

    } catch (error) {

        console.error('댓글 삭제 오류:', error);

        res.status(500).json({
            message: '댓글 삭제 실패',
            error: error.message
        });

    }

});


module.exports = router;
