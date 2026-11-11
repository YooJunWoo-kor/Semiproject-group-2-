const express = require('express');
const db = require('../db');

const router = express.Router();

// ==========================================
// 1. 직원 정보 조회
// ==========================================

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
// 2. 자유게시판 전체 조회
// ==========================================

router.get('/free-posts', async (req, res) => {
    try {
        // 게시글 조회
        const [posts] = await db.promise().query(
            `SELECT
                post_id,
                post_title,
                post_content,
                author,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS createdAt,
                DATE_FORMAT(updated_at, '%Y-%m-%d') AS updatedAt
             FROM free_posts
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
             FROM free_comments
             ORDER BY created_at ASC`
        );

        // 게시글마다 해당 댓글 연결
        console.log(posts, comments);

        const result = posts.map((post) => {
            return {
                ...post,

                comments: comments.filter(
                    (comment) => comment.post_id === post.post_id
                )
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('게시글 조회 오류:', {
            file: __filename,
            message: error.message,
            sql: error.sql
        });

        res.status(500).json({
            message: '게시글 조회 실패',
            error: error.message
        });
    }
});

// ==========================================
// 3. 자유게시판 게시글 등록
// ==========================================

router.post('/free-posts', async (req, res) => {
    const { post_title, post_content, author } = req.body;

    if (!post_title || !post_content || !author) {
        return res.status(400).json({
            message: '제목, 내용, 작성자는 필수입니다.'
        });
    }

    try {
        const [result] = await db.promise().query(
            `INSERT INTO free_posts
             (post_title, post_content, author)
             VALUES (?, ?, ?)`,
            [post_title, post_content, author]
        );

        res.status(201).json({
            message: '게시글 등록 성공',
            post_id: result.insertId
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
// 4. 자유게시판 게시글 수정
// ==========================================

router.put('/free-posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const { post_title, post_content } = req.body;

    if (!post_title || !post_content) {
        return res.status(400).json({
            message: '제목과 내용은 필수입니다.'
        });
    }

    try {
        const [result] = await db.promise().query(
            `UPDATE free_posts
             SET post_title = ?, post_content = ?
             WHERE post_id = ?`,
            [post_title, post_content, postId]
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
// 5. 자유게시판 게시글 삭제
// ==========================================

router.delete('/free-posts/:postId', async (req, res) => {
    const { postId } = req.params;

    try {
        const [result] = await db.promise().query(
            'DELETE FROM free_posts WHERE post_id = ?',
            [postId]
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
// 6. 자유게시판 댓글 등록
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
            `INSERT INTO free_comments
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
// 7. 자유게시판 댓글 삭제
// ==========================================

router.delete('/comments/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.promise().query(
            'DELETE FROM free_comments WHERE id = ?',
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

// ===== [기존] 공지사항 목록 조회 API 시작 =====

router.get('/notices', async (req, res) => {
    try {
        const [notices] = await db.promise().query(
            `SELECT
                post_id,
                post_title,
                post_content,
                author,
                category,
                important,
                views,
                created_at,
                updated_at
             FROM notice_posts
             ORDER BY
                important DESC,
                created_at DESC,
                post_id DESC`
        );

        // [추가] 공지사항마다 저장된 댓글 연결
        const [comments] = await db.promise().query('SELECT id, post_id, content, author, created_at FROM notice_comments ORDER BY created_at, id');
        res.status(200).json(notices.map(post => ({ ...post, comments: comments.filter(comment => comment.post_id === post.post_id) })));
    } catch (error) {
        console.error('공지사항 조회 오류:', {
            file: __filename,
            message: error.message,
            sql: error.sql
        });

        res.status(500).json({
            message: '공지사항 조회 실패',
            error: error.message
        });
    }
});

// ===== [기존] 공지사항 목록 조회 API 끝 =====


// ===== [추가] 업무자료실 글·댓글·첨부파일 API 시작 =====
const techUpload = require('multer')({
    storage: require('multer').memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 5, fieldSize: 1024 * 1024 }
}).array('files', 3);
const techValidId = value => /^[1-9]\d*$/.test(String(value));
const techConnection = () => require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
});

router.get('/tech-library', async (req, res) => {
    try {
        const [posts] = await db.promise().query('SELECT post_id, post_title, post_content, author, category, created_at, updated_at FROM techlibrary ORDER BY created_at DESC, post_id DESC');
        // [추가] 부가 테이블 생성 전에도 기존 게시글 목록은 표시
        const optionalRows = async sql => {
            try { return (await db.promise().query(sql))[0]; }
            catch (error) {
                if (error.code === 'ER_NO_SUCH_TABLE') return [];
                throw error;
            }
        };
        const files = await optionalRows('SELECT file_id, post_id, file_name, file_size FROM techlibrary_files ORDER BY file_id');
        const comments = await optionalRows('SELECT id, post_id, content, author, created_at FROM techlibrary_comments ORDER BY created_at, id');
        const group = rows => {
            const grouped = new Map();
            for (const row of rows) {
                const key = String(row.post_id);
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key).push(row);
            }
            return grouped;
        };
        const fileMap = group(files), commentMap = group(comments);
        res.json(posts.map(post => ({ ...post, files: fileMap.get(String(post.post_id)) || [], comments: commentMap.get(String(post.post_id)) || [] })));
    } catch (error) {
        console.error('업무자료실 조회 오류:', error);
        res.status(500).json({ message: '업무자료실 목록을 불러오지 못했습니다.', error: error.message });
    }
});

// [추가] 새 글 등록과 수정 모두 파일과 본문을 하나의 작업으로 저장
const techSave = editing => (req, res) => {
    techUpload(req, res, async uploadError => {
        if (uploadError) return res.status(400).json({ message: '첨부파일은 최대 3개, 파일당 5MB까지 등록할 수 있습니다.' });
        if (editing && !techValidId(req.params.postId)) return res.status(400).json({ message: '잘못된 게시글 번호입니다.' });
        const { post_title, post_content, author, category } = req.body || {};
        const required = editing ? [post_title, post_content, category] : [post_title, post_content, author, category];
        if (!required.every(value => typeof value === 'string' && value.trim())) return res.status(400).json({ message: '제목, 내용, 분류와 작성자를 확인해 주세요.' });
        if (post_title.trim().length > 200 || category.trim().length > 100 || (!editing && author.trim().length > 100)) return res.status(400).json({ message: '제목은 200자, 분류와 작성자는 100자까지 입력해 주세요.' });
        let removeIds;
        try {
            removeIds = JSON.parse(req.body.remove_file_ids || '[]');
            if (!Array.isArray(removeIds) || !removeIds.every(techValidId)) throw Error();
            removeIds = [...new Set(removeIds.map(String))];
        } catch {
            return res.status(400).json({ message: '삭제할 첨부파일 번호가 올바르지 않습니다.' });
        }
        let connection;
        try {
            connection = await techConnection();
            await connection.beginTransaction();
            let postId = req.params.postId;
            if (editing) {
                const [posts] = await connection.execute('SELECT post_id FROM techlibrary WHERE post_id = ? FOR UPDATE', [postId]);
                if (!posts.length) {
                    await connection.rollback();
                    return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
                }
                const [existing] = await connection.execute('SELECT file_id FROM techlibrary_files WHERE post_id = ?', [postId]);
                if (removeIds.some(id => !existing.some(file => String(file.file_id) === id))) {
                    await connection.rollback();
                    return res.status(400).json({ message: '다른 게시글의 첨부파일을 삭제할 수 없습니다.' });
                }
                if (existing.length - removeIds.length + (req.files || []).length > 3) {
                    await connection.rollback();
                    return res.status(400).json({ message: '기존 파일과 새 파일을 합쳐 최대 3개까지 저장할 수 있습니다.' });
                }
                await connection.execute('UPDATE techlibrary SET post_title = ?, post_content = ?, category = ? WHERE post_id = ?', [post_title.trim(), post_content.trim(), category.trim(), postId]);
                for (const id of removeIds) await connection.execute('DELETE FROM techlibrary_files WHERE post_id = ? AND file_id = ?', [postId, id]);
            } else {
                const [result] = await connection.execute('INSERT INTO techlibrary (post_title, post_content, author, category) VALUES (?, ?, ?, ?)', [post_title.trim(), post_content.trim(), author.trim(), category.trim()]);
                postId = result.insertId;
            }
            for (const file of req.files || []) {
                const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const cleanName = (decoded.includes('\uFFFD') ? file.originalname : decoded).split(/[\\/]/).pop().replace(/[\r\n\x00-\x1f\x7f]/g, '');
                const filename = Array.from(cleanName).slice(0, 200).join('') || 'attachment';
                await connection.execute('INSERT INTO techlibrary_files (post_id, file_name, file_size, file_data) VALUES (?, ?, ?, ?)', [postId, filename, file.size, file.buffer]);
            }
            await connection.commit();
            res.status(editing ? 200 : 201).json({ post_id: Number(postId), message: editing ? '자료가 수정되었습니다.' : '자료가 등록되었습니다.' });
        } catch (error) {
            if (connection) await connection.rollback().catch(() => {});
            console.error('업무자료 저장 오류:', error);
            res.status(500).json({ message: '자료 저장에 실패했습니다.', error: error.message });
        } finally {
            if (connection) await connection.end().catch(() => {});
        }
    });
};
router.post('/tech-library', techSave(false));
router.put('/tech-library/:postId', techSave(true));

router.delete('/tech-library/:postId', async (req, res) => {
    if (!techValidId(req.params.postId)) return res.status(400).json({ message: '잘못된 게시글 번호입니다.' });
    try {
        // [추가] 외래키의 ON DELETE CASCADE로 댓글과 파일도 함께 삭제
        const [result] = await db.promise().execute('DELETE FROM techlibrary WHERE post_id = ?', [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        res.json({ message: '자료가 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '자료 삭제에 실패했습니다.', error: error.message });
    }
});

router.post('/tech-library/:postId/comments', async (req, res) => {
    const { content, author } = req.body || {};
    if (!techValidId(req.params.postId) || ![content, author].every(value => typeof value === 'string' && value.trim()) || content.length > 10000 || author.length > 100) return res.status(400).json({ message: '댓글 내용과 작성자를 확인해 주세요. 댓글은 10,000자까지 입력할 수 있습니다.' });
    try {
        const [result] = await db.promise().execute('INSERT INTO techlibrary_comments (post_id, content, author) VALUES (?, ?, ?)', [req.params.postId, content.trim(), author.trim()]);
        res.status(201).json({ id: result.insertId, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 404 : 500).json({ message: error.code === 'ER_NO_REFERENCED_ROW_2' ? '게시글을 찾을 수 없습니다.' : '댓글 등록에 실패했습니다.' });
    }
});
router.delete('/tech-library/:postId/comments/:commentId', async (req, res) => {
    if (![req.params.postId, req.params.commentId].every(techValidId)) return res.status(400).json({ message: '잘못된 댓글 번호입니다.' });
    try {
        const [result] = await db.promise().execute('DELETE FROM techlibrary_comments WHERE post_id = ? AND id = ?', [req.params.postId, req.params.commentId]);
        if (!result.affectedRows) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '댓글 삭제에 실패했습니다.', error: error.message });
    }
});

router.get('/tech-library/:postId/files/:fileId', async (req, res) => {
    if (![req.params.postId, req.params.fileId].every(techValidId)) return res.status(400).json({ message: '잘못된 자료 또는 파일 번호입니다.' });
    try {
        const [files] = await db.promise().execute('SELECT file_name, file_data FROM techlibrary_files WHERE post_id = ? AND file_id = ?', [req.params.postId, req.params.fileId]);
        if (!files.length) return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다.' });
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', "attachment; filename=\"attachment\"; filename*=UTF-8''" + encodeURIComponent(files[0].file_name));
        res.send(files[0].file_data);
    } catch (error) {
        res.status(500).json({ message: '첨부파일 다운로드에 실패했습니다.', error: error.message });
    }
});
// ===== [추가] 업무자료실 글·댓글·첨부파일 API 끝 =====

// ===== [추가] 공지사항 등록·수정·삭제 시작 =====
const validNoticeBody = body => body &&
    ['post_title', 'post_content', 'category'].every(key => typeof body[key] === 'string' && body[key].trim()) &&
    body.post_title.trim().length <= 200 && body.category.trim().length <= 100;

router.post('/notices', async (req, res) => {
    const body = req.body;
    if (!validNoticeBody(body) || typeof body.author !== 'string' || !body.author.trim() || body.author.trim().length > 100) {
        return res.status(400).json({ message: '제목, 내용, 분류와 작성자를 확인해 주세요.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO notice_posts (post_title, post_content, author, category, important) VALUES (?, ?, ?, ?, ?)',
            [body.post_title.trim(), body.post_content.trim(), body.author.trim(), body.category.trim(), body.category.trim() === '중요공지' ? 1 : 0]
        );
        res.status(201).json({ post_id: result.insertId, message: '공지사항이 등록되었습니다.' });
    } catch (error) {
        console.error('공지사항 등록 오류:', error);
        res.status(500).json({ message: '공지사항 등록에 실패했습니다.' });
    }
});

router.put('/notices/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId) || !validNoticeBody(req.body)) {
        return res.status(400).json({ message: '게시글 번호, 제목, 내용과 분류를 확인해 주세요.' });
    }
    const body = req.body;
    try {
        const [result] = await db.promise().execute(
            'UPDATE notice_posts SET post_title = ?, post_content = ?, category = ?, important = ? WHERE post_id = ?',
            [body.post_title.trim(), body.post_content.trim(), body.category.trim(), body.category.trim() === '중요공지' ? 1 : 0, req.params.postId]
        );
        if (!result.affectedRows) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
        res.json({ message: '공지사항이 수정되었습니다.' });
    } catch (error) {
        console.error('공지사항 수정 오류:', error);
        res.status(500).json({ message: '공지사항 수정에 실패했습니다.' });
    }
});

router.delete('/notices/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId)) return res.status(400).json({ message: '잘못된 게시글 번호입니다.' });
    try {
        const [result] = await db.promise().execute('DELETE FROM notice_posts WHERE post_id = ?', [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
        res.json({ message: '공지사항이 삭제되었습니다.' });
    } catch (error) {
        console.error('공지사항 삭제 오류:', error);
        res.status(500).json({ message: '공지사항 삭제에 실패했습니다.' });
    }
});
// ===== [추가] 공지사항 등록·수정·삭제 끝 =====


// ===== [추가] 공지사항 댓글 등록 시작 =====
router.post('/notices/:postId/comments', async (req, res) => {
    const { content, author } = req.body || {};
    if (!/^[1-9]\d*$/.test(req.params.postId) ||
        ![content, author].every(value => typeof value === 'string' && value.trim()) ||
        content.length > 10000 || author.length > 100) {
        return res.status(400).json({ message: '댓글 내용과 작성자를 확인해 주세요. 댓글은 10,000자까지 입력할 수 있습니다.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO notice_comments (post_id, content, author) VALUES (?, ?, ?)',
            [req.params.postId, content.trim(), author.trim()]
        );
        res.status(201).json({ id: result.insertId, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        console.error('공지사항 댓글 등록 오류:', error);
        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 404 : 500).json({
            message: error.code === 'ER_NO_REFERENCED_ROW_2' ? '공지사항을 찾을 수 없습니다.' : '댓글 등록에 실패했습니다.'
        });
    }
});
// ===== [추가] 공지사항 댓글 등록 끝 =====

// ===== [추가] Q&A 등록·수정·삭제 시작 =====
const validQnABody = body => body &&
    ['post_title', 'post_content', 'category'].every(key => typeof body[key] === 'string' && body[key].trim()) &&
    body.post_title.trim().length <= 200 && body.category.trim().length <= 100;

router.post('/qna', async (req, res) => {
    const body = req.body;
    if (!validQnABody(body) || typeof body.author !== 'string' || !body.author.trim() || body.author.trim().length > 100) {
        return res.status(400).json({ message: '제목, 내용, 분류와 작성자를 확인해 주세요.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO qna_posts (post_title, post_content, author, category) VALUES (?, ?, ?, ?)',
            [body.post_title.trim(), body.post_content.trim(), body.author.trim(), body.category.trim()]
        );
        res.status(201).json({ post_id: result.insertId, message: 'Q&A이 등록되었습니다.' });
    } catch (error) {
        console.error('Q&A 등록 오류:', error);
        res.status(500).json({ message: 'Q&A 등록에 실패했습니다.' });
    }
});

router.put('/qna/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId) || !validQnABody(req.body)) {
        return res.status(400).json({ message: '게시글 번호, 제목, 내용과 분류를 확인해 주세요.' });
    }
    const body = req.body;
    try {
        const [result] = await db.promise().execute(
            'UPDATE qna_posts SET post_title = ?, post_content = ?, category = ? WHERE post_id = ?',
            [body.post_title.trim(), body.post_content.trim(), body.category.trim(), req.params.postId]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Q&A을 찾을 수 없습니다.' });
        res.json({ message: 'Q&A이 수정되었습니다.' });
    } catch (error) {
        console.error('Q&A 수정 오류:', error);
        res.status(500).json({ message: 'Q&A 수정에 실패했습니다.' });
    }
});

router.delete('/qna/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId)) return res.status(400).json({ message: '잘못된 게시글 번호입니다.' });
    try {
        const [result] = await db.promise().execute('DELETE FROM qna_posts WHERE post_id = ?', [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Q&A을 찾을 수 없습니다.' });
        res.json({ message: 'Q&A이 삭제되었습니다.' });
    } catch (error) {
        console.error('Q&A 삭제 오류:', error);
        res.status(500).json({ message: 'Q&A 삭제에 실패했습니다.' });
    }
});
// ===== [추가] Q&A 등록·수정·삭제 끝 =====
// ===== [추가] Q&A 댓글 등록 시작 =====
router.post('/qna/:postId/comments', async (req, res) => {
    const { content, author } = req.body || {};
    if (!/^[1-9]\d*$/.test(req.params.postId) ||
        ![content, author].every(value => typeof value === 'string' && value.trim()) ||
        content.length > 10000 || author.length > 100) {
        return res.status(400).json({ message: '댓글 내용과 작성자를 확인해 주세요. 댓글은 10,000자까지 입력할 수 있습니다.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO qna_comments (post_id, content, author) VALUES (?, ?, ?)',
            [req.params.postId, content.trim(), author.trim()]
        );
        res.status(201).json({ id: result.insertId, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        console.error('Q&A 댓글 등록 오류:', error);
        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 404 : 500).json({
            message: error.code === 'ER_NO_REFERENCED_ROW_2' ? 'Q&A을 찾을 수 없습니다.' : '댓글 등록에 실패했습니다.'
        });
    }
});
// ===== [추가] Q&A 댓글 등록 끝 =====

// [추가] Q&A 목록과 댓글 조회
router.get('/qna', async (req,res)=>{try{const [posts]=await db.promise().query('SELECT * FROM qna_posts ORDER BY created_at DESC, post_id DESC');const [comments]=await db.promise().query('SELECT * FROM qna_comments ORDER BY created_at, id');const grouped=new Map();for(const c of comments){if(!grouped.has(c.post_id))grouped.set(c.post_id,[]);grouped.get(c.post_id).push(c);}res.json(posts.map(p=>({...p,comments:grouped.get(p.post_id)||[]})));}catch(error){console.error('Q&A 조회 오류:',error);res.status(500).json({message:'Q&A 목록 조회 실패'});}});
router.delete('/qna/:postId/comments/:commentId',async(req,res)=>{if(![req.params.postId,req.params.commentId].every(id=>/^[1-9]\d*$/.test(id)))return res.status(400).json({message:'잘못된 댓글 번호입니다.'});try{const [result]=await db.promise().execute('DELETE FROM qna_comments WHERE post_id = ? AND id = ?',[req.params.postId,req.params.commentId]);if(!result.affectedRows)return res.status(404).json({message:'댓글을 찾을 수 없습니다.'});res.json({message:'댓글이 삭제되었습니다.'});}catch(error){res.status(500).json({message:'댓글 삭제 실패'});}});

// ===== [추가] 개선 건의 등록·수정·삭제 시작 =====
const validSuggestionBody = body => body &&
    ['post_title', 'post_content', 'category'].every(key => typeof body[key] === 'string' && body[key].trim()) &&
    body.post_title.trim().length <= 200 && body.category.trim().length <= 100;

router.post('/suggestions', async (req, res) => {
    const body = req.body;
    if (!validSuggestionBody(body) || typeof body.author !== 'string' || !body.author.trim() || body.author.trim().length > 100) {
        return res.status(400).json({ message: '제목, 내용, 분류와 작성자를 확인해 주세요.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO suggestion_posts (post_title, post_content, author, category) VALUES (?, ?, ?, ?)',
            [body.post_title.trim(), body.post_content.trim(), body.author.trim(), body.category.trim()]
        );
        res.status(201).json({ post_id: result.insertId, message: '개선 건의이 등록되었습니다.' });
    } catch (error) {
        console.error('개선 건의 등록 오류:', error);
        res.status(500).json({ message: '개선 건의 등록에 실패했습니다.' });
    }
});

router.put('/suggestions/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId) || !validSuggestionBody(req.body)) {
        return res.status(400).json({ message: '게시글 번호, 제목, 내용과 분류를 확인해 주세요.' });
    }
    const body = req.body;
    try {
        const [result] = await db.promise().execute(
            'UPDATE suggestion_posts SET post_title = ?, post_content = ?, category = ? WHERE post_id = ?',
            [body.post_title.trim(), body.post_content.trim(), body.category.trim(), req.params.postId]
        );
        if (!result.affectedRows) return res.status(404).json({ message: '개선 건의을 찾을 수 없습니다.' });
        res.json({ message: '개선 건의이 수정되었습니다.' });
    } catch (error) {
        console.error('개선 건의 수정 오류:', error);
        res.status(500).json({ message: '개선 건의 수정에 실패했습니다.' });
    }
});

router.delete('/suggestions/:postId', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.postId)) return res.status(400).json({ message: '잘못된 게시글 번호입니다.' });
    try {
        const [result] = await db.promise().execute('DELETE FROM suggestion_posts WHERE post_id = ?', [req.params.postId]);
        if (!result.affectedRows) return res.status(404).json({ message: '개선 건의을 찾을 수 없습니다.' });
        res.json({ message: '개선 건의이 삭제되었습니다.' });
    } catch (error) {
        console.error('개선 건의 삭제 오류:', error);
        res.status(500).json({ message: '개선 건의 삭제에 실패했습니다.' });
    }
});
// ===== [추가] 개선 건의 등록·수정·삭제 끝 =====
// ===== [추가] 개선 건의 댓글 등록 시작 =====
router.post('/suggestions/:postId/comments', async (req, res) => {
    const { content, author } = req.body || {};
    if (!/^[1-9]\d*$/.test(req.params.postId) ||
        ![content, author].every(value => typeof value === 'string' && value.trim()) ||
        content.length > 10000 || author.length > 100) {
        return res.status(400).json({ message: '댓글 내용과 작성자를 확인해 주세요. 댓글은 10,000자까지 입력할 수 있습니다.' });
    }
    try {
        const [result] = await db.promise().execute(
            'INSERT INTO suggestion_comments (post_id, content, author) VALUES (?, ?, ?)',
            [req.params.postId, content.trim(), author.trim()]
        );
        res.status(201).json({ id: result.insertId, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        console.error('개선 건의 댓글 등록 오류:', error);
        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 404 : 500).json({
            message: error.code === 'ER_NO_REFERENCED_ROW_2' ? '개선 건의을 찾을 수 없습니다.' : '댓글 등록에 실패했습니다.'
        });
    }
});
// ===== [추가] 개선 건의 댓글 등록 끝 =====

// [추가] 개선 건의 목록과 댓글 조회
router.get('/suggestions', async (req,res)=>{try{const [posts]=await db.promise().query('SELECT * FROM suggestion_posts ORDER BY created_at DESC, post_id DESC');const [comments]=await db.promise().query('SELECT * FROM suggestion_comments ORDER BY created_at, id');const grouped=new Map();for(const c of comments){if(!grouped.has(c.post_id))grouped.set(c.post_id,[]);grouped.get(c.post_id).push(c);}res.json(posts.map(p=>({...p,comments:grouped.get(p.post_id)||[]})));}catch(error){console.error('개선 건의 조회 오류:',error);res.status(500).json({message:'개선 건의 목록 조회 실패'});}});
router.delete('/suggestions/:postId/comments/:commentId',async(req,res)=>{if(![req.params.postId,req.params.commentId].every(id=>/^[1-9]\d*$/.test(id)))return res.status(400).json({message:'잘못된 댓글 번호입니다.'});try{const [result]=await db.promise().execute('DELETE FROM suggestion_comments WHERE post_id = ? AND id = ?',[req.params.postId,req.params.commentId]);if(!result.affectedRows)return res.status(404).json({message:'댓글을 찾을 수 없습니다.'});res.json({message:'댓글이 삭제되었습니다.'});}catch(error){res.status(500).json({message:'댓글 삭제 실패'});}});

module.exports = router;
