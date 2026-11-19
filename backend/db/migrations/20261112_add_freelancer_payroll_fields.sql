-- HR 급여의 프리랜서 3.3% 원천징수 및 상태 변경 이력
-- 기존 payrolls 행은 삭제하거나 재계산하지 않고 신규 컬럼의 기본값만 적용합니다.

ALTER TABLE payrolls
    ADD COLUMN other_payment BIGINT NOT NULL DEFAULT 0 AFTER bonus,
    ADD COLUMN income_tax BIGINT NOT NULL DEFAULT 0 AFTER other_payment,
    ADD COLUMN local_income_tax BIGINT NOT NULL DEFAULT 0 AFTER income_tax;

CREATE TABLE IF NOT EXISTS payroll_change_history (
    history_id INT NOT NULL AUTO_INCREMENT,
    payroll_id INT NOT NULL,
    employee_id INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NULL,
    reason VARCHAR(255) NULL,
    changed_by INT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (history_id),
    KEY idx_payroll_change_history_payroll (payroll_id, changed_at),
    KEY idx_payroll_change_history_employee (employee_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
