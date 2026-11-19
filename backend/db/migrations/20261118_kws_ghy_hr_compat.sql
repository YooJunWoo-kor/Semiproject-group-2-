-- KWS DB -> GHY HR merge compatibility (MySQL 8.x)
-- BACK UP DB BEFORE RUNNING. No DROP/DELETE of application data.
-- Run this migration instead of duplicating the older GHY salary/freelancer schema migrations.
-- MySQL DDL auto-commits; do not rely on ROLLBACK for ALTER TABLE.

SET @sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'initial_annual_salary') = 0,
 'ALTER TABLE employees ADD COLUMN initial_annual_salary BIGINT NOT NULL DEFAULT 0',
 'SELECT ''employees.initial_annual_salary already exists'' AS info'
);
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

SET @sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'resignation_date') = 0,
 'ALTER TABLE employees ADD COLUMN resignation_date DATE NULL',
 'SELECT ''employees.resignation_date already exists'' AS info'
);
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

SET @sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payrolls' AND COLUMN_NAME = 'other_payment') = 0,
 'ALTER TABLE payrolls ADD COLUMN other_payment BIGINT NOT NULL DEFAULT 0',
 'SELECT ''payrolls.other_payment already exists'' AS info'
);
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

SET @sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payrolls' AND COLUMN_NAME = 'income_tax') = 0,
 'ALTER TABLE payrolls ADD COLUMN income_tax BIGINT NOT NULL DEFAULT 0',
 'SELECT ''payrolls.income_tax already exists'' AS info'
);
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

SET @sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payrolls' AND COLUMN_NAME = 'local_income_tax') = 0,
 'ALTER TABLE payrolls ADD COLUMN local_income_tax BIGINT NOT NULL DEFAULT 0',
 'SELECT ''payrolls.local_income_tax already exists'' AS info'
);
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

CREATE TABLE IF NOT EXISTS employee_salary_history (
 salary_history_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 annual_salary BIGINT NOT NULL,
 effective_month CHAR(7) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_employee_salary_month (employee_id, effective_month),
 KEY idx_salary_history_lookup (employee_id, effective_month),
 CONSTRAINT fk_salary_history_employee FOREIGN KEY (employee_id)
   REFERENCES employees (employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_change_history (
 history_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 payroll_id INT NOT NULL,
 employee_id INT NOT NULL,
 action_type VARCHAR(30) NOT NULL,
 previous_status VARCHAR(20) NULL,
 new_status VARCHAR(20) NULL,
 reason VARCHAR(255) NULL,
 changed_by INT NULL,
 changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_payroll_change_history_payroll (payroll_id, changed_at),
 KEY idx_payroll_change_history_employee (employee_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preserve historical figures: don't overwrite existing payroll amounts.
INSERT IGNORE INTO employee_salary_history(employee_id, annual_salary, effective_month)
SELECT employee_id, initial_annual_salary, DATE_FORMAT(hire_date,'%Y-%m')
FROM employees
WHERE initial_annual_salary > 0 AND hire_date IS NOT NULL;

SELECT COUNT(*) INTO @duplicate_months
FROM (
 SELECT employee_id, pay_month
 FROM payrolls GROUP BY employee_id, pay_month HAVING COUNT(*) > 1
) duplicate_payroll_months;
SET @has_unique = (
 SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payrolls'
 AND INDEX_NAME='uq_payroll_employee_month'
);
SET @sql = IF(@duplicate_months>0,
 'SELECT ''WARNING: duplicate payroll rows; resolve duplicates before creating unique key'' AS warning',
 IF(@has_unique>0,
  'SELECT ''payroll monthly unique key already exists'' AS info',
  'ALTER TABLE payrolls ADD UNIQUE KEY uq_payroll_employee_month (employee_id, pay_month)'));
PREPARE migrate_stmt FROM @sql; EXECUTE migrate_stmt; DEALLOCATE PREPARE migrate_stmt;

SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE
FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND
 ((TABLE_NAME='employees' AND COLUMN_NAME IN ('initial_annual_salary','resignation_date'))
 OR (TABLE_NAME='payrolls' AND COLUMN_NAME IN ('other_payment','income_tax','local_income_tax')))
ORDER BY TABLE_NAME,COLUMN_NAME;
SELECT employee_id,employee_number,name,initial_annual_salary FROM employees
WHERE initial_annual_salary=0;
SELECT employee_id,pay_month,COUNT(*) AS duplicate_count FROM payrolls
GROUP BY employee_id,pay_month HAVING COUNT(*)>1;
