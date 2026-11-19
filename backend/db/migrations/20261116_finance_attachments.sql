-- 기존 approval_attachments 테이블과 충돌하지 않는 재무 첨부 전용 메타데이터입니다.
-- 사용하는 ERP DB를 선택한 상태에서 한 번 실행합니다. 재실행해도 자료를 삭제하지 않습니다.
CREATE TABLE IF NOT EXISTS finance_approval_attachments (
    file_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    document_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (file_id),
    UNIQUE KEY uq_finance_attachment_stored_name (stored_name),
    KEY idx_finance_attachment_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- my_draft.receipt_image_url은 현재 기안서 업로드에서 사용 중인 기존 컬럼을 그대로 사용합니다.
