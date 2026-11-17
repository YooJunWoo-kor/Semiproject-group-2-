-- 직원 연봉 변경 이력과 월별 급여 자동 생성을 위한 이력 테이블
-- 최초 1회 실행하세요.

CREATE TABLE IF NOT EXISTS employee_salary_history (
    salary_history_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    annual_salary BIGINT NOT NULL,
    effective_month CHAR(7) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (salary_history_id),
    UNIQUE KEY uq_employee_salary_month (employee_id, effective_month),
    KEY idx_salary_history_lookup (employee_id, effective_month),
    CONSTRAINT fk_salary_history_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees (employee_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 기존 직원은 입사월부터 현재 등록된 최초 연봉을 적용합니다.
-- 이미 이력이 있으면 기존 이력을 덮어쓰지 않습니다.
INSERT IGNORE INTO employee_salary_history (
    employee_id,
    annual_salary,
    effective_month
)
SELECT
    employee_id,
    initial_annual_salary,
    DATE_FORMAT(hire_date, '%Y-%m')
FROM employees
WHERE initial_annual_salary IS NOT NULL;

-- 직원별 월 급여는 한 달에 하나만 존재하도록 보장합니다.
ALTER TABLE payrolls
    ADD UNIQUE KEY uq_payroll_employee_month (employee_id, pay_month);
