// 첨부 메타데이터만 DB에 저장합니다. 실제 파일은 공통 imageUpload가 저장합니다.
module.exports = {
    selectDocument: 'SELECT document_id, employee_id, approval_status FROM approval_documents WHERE document_id = ?',
    selectDraft: 'SELECT draft_id, receipt_image_url, created_at FROM my_draft WHERE draft_id = ?',
    selectAttachments: `SELECT file_id, original_name, file_size, mime_type,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
        FROM finance_approval_attachments WHERE document_id = ? ORDER BY file_id DESC`,
    selectAttachment: `SELECT original_name, stored_name, mime_type
        FROM finance_approval_attachments WHERE document_id = ? AND file_id = ?`,
    // 검사와 저장을 한 쿼리에서 수행하여 승인된 문서에 추가되는 것을 방지합니다.
    insertAttachment: `INSERT INTO finance_approval_attachments
        (document_id, employee_id, original_name, stored_name, mime_type, file_size)
        SELECT a.document_id, a.employee_id, ?, ?, ?, ?
        FROM approval_documents a
        INNER JOIN employee_accounts ea ON ea.employee_id = a.employee_id
        WHERE a.document_id = ? AND a.employee_id = ?
          AND a.approval_status = '대기' AND ea.account_status = 'ACTIVE'`
};
