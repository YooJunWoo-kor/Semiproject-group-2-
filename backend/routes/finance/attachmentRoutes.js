const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const db = require('../../db');
const createImageUpload = require('../../middleware/imageUpload');
const queries = require('../../queries/finance/attachmentQueries');

const router = express.Router();
const upload = createImageUpload('approvals').single('file');
const approvalDirectory = path.resolve(__dirname, '../../uploads/approvals');
const receiptDirectory = path.resolve(__dirname, '../../uploads/Receipts');
const imageName = /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i;
const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function documentKey(value) {
    const match = /^(draft-)?([1-9]\d*)$/.exec(String(value));
    if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
    return { draft: Boolean(match[1]), id: Number(match[2]) };
}

async function removeUpload(file) {
    if (!file) return;
    try { await fs.unlink(file.path); }
    catch (error) { if (error.code !== 'ENOENT') console.error('첨부 임시파일 정리 실패:', error); }
}

function handleError(res, error) {
    console.error('재무 첨부파일 처리 오류:', error);
    if (res.headersSent) return;
    if (error.code === 'ENOENT') return res.status(404).json({ message: '저장된 이미지 파일을 찾을 수 없습니다.' });
    return res.status(500).json({ message: '첨부파일 처리에 실패했습니다. DB 마이그레이션과 서버 로그를 확인해주세요.' });
}

// URL 문자열을 클라이언트에서 받아 열지 않고, DB에 저장된 기안서 경로만 사용합니다.
async function draftReceipt(id) {
    const [rows] = await db.promise().query(queries.selectDraft, [id]);
    if (!rows.length) return { missing: true };
    const value = rows[0].receipt_image_url;
    if (!value) return { file: null };
    const prefix = '/api/drafts/receipts/';
    const name = String(value).startsWith(prefix) ? String(value).slice(prefix.length) : '';
    if (!imageName.test(name)) throw new Error('지원하지 않는 기안서 영수증 저장 경로');
    const filePath = path.join(receiptDirectory, name);
    const stat = await fs.stat(filePath);
    return { filePath, file: {
        file_id: 'receipt', original_name: `기안서-${id}-영수증${path.extname(name).toLowerCase()}`,
        file_size: stat.size, mime_type: types[path.extname(name).toLowerCase()],
        created_at: rows[0].created_at ? new Date(rows[0].created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '',
        source_type: 'draft'
    } };
}

router.get('/approvals/:documentId/attachments', async (req, res) => {
    const key = documentKey(req.params.documentId);
    if (!key) return res.status(400).json({ message: '올바른 문서 번호가 아닙니다.' });
    try {
        if (key.draft) {
            const receipt = await draftReceipt(key.id);
            if (receipt.missing) return res.status(404).json({ message: '기안서를 찾을 수 없습니다.' });
            return res.json(receipt.file ? [receipt.file] : []);
        }
        const [documents] = await db.promise().query(queries.selectDocument, [key.id]);
        if (!documents.length) return res.status(404).json({ message: '결재 문서를 찾을 수 없습니다.' });
        const [files] = await db.promise().query(queries.selectAttachments, [key.id]);
        return res.json(files);
    } catch (error) { return handleError(res, error); }
});

router.post('/approvals/:documentId/attachments', (req, res) => {
    const key = documentKey(req.params.documentId);
    if (!key) return res.status(400).json({ message: '올바른 문서 번호가 아닙니다.' });
    if (key.draft) return res.status(400).json({ message: '기안서의 영수증은 내업무관리에서 등록해주세요.' });
    upload(req, res, async (uploadError) => {
        if (uploadError) {
            await removeUpload(req.file);
            return res.status(400).json({ message: uploadError.code === 'LIMIT_FILE_SIZE'
                ? '파일은 최대 5MB까지 첨부할 수 있습니다.' : uploadError.message });
        }
        const employeeId = Number(req.body.employee_id);
        if (!req.file || !Number.isSafeInteger(employeeId) || employeeId <= 0) {
            await removeUpload(req.file);
            return res.status(400).json({ message: '첨부파일과 작성자 정보가 필요합니다.' });
        }
        // multer의 multipart 파일명(latin1)을 한글 원본 이름으로 복구합니다.
        const decoded = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const originalName = decoded.includes('\uFFFD') ? req.file.originalname : decoded;
        if (Array.from(originalName).length > 255) {
            await removeUpload(req.file);
            return res.status(400).json({ message: '원본 파일명은 255자 이내로 작성해주세요.' });
        }
        try {
            const [result] = await db.promise().query(queries.insertAttachment, [
                originalName, req.file.filename, req.file.mimetype, req.file.size, key.id, employeeId
            ]);
            if (result.affectedRows !== 1) {
                await removeUpload(req.file);
                return res.status(403).json({ message: '작성자만 대기 상태의 결재 문서에 첨부할 수 있습니다.' });
            }
            return res.status(201).json({ message: '증빙파일이 첨부되었습니다.', file_id: result.insertId });
        } catch (error) {
            await removeUpload(req.file);
            return handleError(res, error);
        }
    });
});

router.get('/approvals/:documentId/attachments/:fileId/download', async (req, res) => {
    const key = documentKey(req.params.documentId);
    if (!key) return res.status(400).json({ message: '올바른 문서 번호가 아닙니다.' });
    try {
        let filePath;
        let originalName;
        if (key.draft) {
            if (req.params.fileId !== 'receipt') return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다.' });
            const receipt = await draftReceipt(key.id);
            if (!receipt.file) return res.status(404).json({ message: '기안서 영수증을 찾을 수 없습니다.' });
            filePath = receipt.filePath;
            originalName = receipt.file.original_name;
        } else {
            const fileId = Number(req.params.fileId);
            if (!Number.isSafeInteger(fileId) || fileId <= 0) return res.status(400).json({ message: '올바른 첨부 번호가 아닙니다.' });
            const [files] = await db.promise().query(queries.selectAttachment, [key.id, fileId]);
            if (!files.length || !imageName.test(files[0].stored_name)) return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다.' });
            filePath = path.join(approvalDirectory, files[0].stored_name);
            originalName = files[0].original_name;
            await fs.stat(filePath);
        }
        res.set('X-Content-Type-Options', 'nosniff');
        return res.download(filePath, originalName, error => { if (error) handleError(res, error); });
    } catch (error) { return handleError(res, error); }
});

module.exports = router;
