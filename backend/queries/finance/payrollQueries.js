// SQL definitions. Bind user input through ? parameters in the calling route.

function selectPayrolls(value0) {
    return `
        SELECT p.pay_month,
               'APPROVED' AS approval_status,
               COUNT(DISTINCT p.employee_id) AS employee_count,
               COUNT(*) AS payroll_count,
               SUM(COALESCE(link.base_amount, p.base_salary)) AS base_salary,
               SUM(COALESCE(link.allowance_amount, p.allowance)) AS allowance,
               SUM(COALESCE(link.bonus_amount, p.bonus)) AS bonus,
               SUM(COALESCE(link.gross_amount, p.gross_pay)) AS gross_pay,
               SUM(COALESCE(link.deduction_amount, p.deduction)) AS deduction,
               SUM(COALESCE(link.net_amount, p.net_pay)) AS net_pay,
               SUM(CASE WHEN p.payment_status = '지급완료' THEN 1 ELSE 0 END) AS paid_count
        FROM payrolls p
        INNER JOIN my_draft d
          ON d.document_type = '급여'
         AND d.status IN ('APPROVED', '승인')
         AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.source')) = 'HR_PAYROLL'
         AND JSON_CONTAINS(JSON_EXTRACT(d.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
         AND d.draft_id = (
             SELECT MIN(d2.draft_id)
             FROM my_draft d2
             WHERE d2.document_type = '급여'
               AND d2.status IN ('APPROVED', '승인')
               AND JSON_UNQUOTE(JSON_EXTRACT(d2.detail_data, '$.source')) = 'HR_PAYROLL'
               AND JSON_CONTAINS(JSON_EXTRACT(d2.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
         )
        LEFT JOIN (${value0}) link ON link.payroll_id = p.payroll_id
        WHERE p.payment_status IN ('확정', '승인', '지급대기', '지급완료') AND (p.draft_id IS NULL OR d.status IN ('APPROVED', '승인'))
          AND p.pay_month REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'
        GROUP BY p.pay_month
        ORDER BY p.pay_month DESC
    `;
}

function selectPayrolls2(value0) {
    return `
        SELECT p.payroll_id, p.employee_id, e.name,
               COALESCE(link.base_amount, p.base_salary) AS base_salary,
               COALESCE(link.allowance_amount, p.allowance) AS allowance,
               COALESCE(link.bonus_amount, p.bonus) AS bonus,
               COALESCE(link.other_payment_amount, p.other_payment) AS other_payment,
               COALESCE(link.deduction_amount, p.deduction) AS deduction,
               COALESCE(link.gross_amount, p.gross_pay) AS gross_pay,
               COALESCE(link.net_amount, p.net_pay) AS net_pay,
               p.payment_status, d.draft_id,
               d.title AS draft_title,
               link.payment_id, link.deduction_status,
               DATE_FORMAT(paid.payment_date, '%Y-%m-%d') AS registered_payment_date,
               paid.amount AS registered_payment_amount,
               account.bank_name AS payment_bank_name,
               account.account_name AS payment_account_name
        FROM payrolls p
        INNER JOIN employees e ON e.employee_id = p.employee_id
        INNER JOIN my_draft d
          ON d.document_type = '급여'
         AND d.status IN ('APPROVED', '승인')
         AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.source')) = 'HR_PAYROLL'
         AND JSON_CONTAINS(JSON_EXTRACT(d.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
         AND d.draft_id = (
             SELECT MIN(d2.draft_id)
             FROM my_draft d2
             WHERE d2.document_type = '급여'
               AND d2.status IN ('APPROVED', '승인')
               AND JSON_UNQUOTE(JSON_EXTRACT(d2.detail_data, '$.source')) = 'HR_PAYROLL'
               AND JSON_CONTAINS(JSON_EXTRACT(d2.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
         )
        LEFT JOIN (${value0}) link ON link.payroll_id = p.payroll_id
        LEFT JOIN payments paid ON paid.payment_id = link.payment_id
        LEFT JOIN bank_accounts account ON account.account_id = paid.account_id
        -- [수정] 직원별 상세 조회를 선택한 급여월로 제한합니다.
        WHERE p.pay_month = ?
          AND d.status IN ('APPROVED', '승인')
        ORDER BY p.employee_id, p.payroll_id
    `;
}

const selectEmployees = `SELECT e.department_id, ea.role
            FROM employees e INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
            WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`;

const selectPayrolls3 = `SELECT p.*, d.status AS approval_status, d.draft_id
            FROM payrolls p
            INNER JOIN my_draft d
              ON d.document_type = '급여'
             AND d.status IN ('APPROVED', '승인')
             AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.source')) = 'HR_PAYROLL'
             AND JSON_CONTAINS(JSON_EXTRACT(d.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
             AND d.draft_id = (
                 SELECT MIN(d2.draft_id)
                 FROM my_draft d2
                 WHERE d2.document_type = '급여'
                   AND d2.status IN ('APPROVED', '승인')
                   AND JSON_UNQUOTE(JSON_EXTRACT(d2.detail_data, '$.source')) = 'HR_PAYROLL'
                   AND JSON_CONTAINS(JSON_EXTRACT(d2.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
             )
            -- [수정] 일괄 지급 잠금·대상을 선택한 급여월로 제한합니다.
            WHERE p.pay_month = ?
            ORDER BY p.payroll_id FOR UPDATE`;

const selectPayments = 'SELECT payroll_id FROM payments WHERE payroll_id = ? FOR UPDATE';

// 급여 지출은 payrolls/payments를 원본으로 사용합니다. 별도 거래 연결 테이블은 사용하지 않습니다.
const selectTradeTransactions = 'SELECT 0 AS transaction_id WHERE 1 = 0';

const selectBankAccounts = 'SELECT balance, currency, account_status FROM bank_accounts WHERE account_id = ? FOR UPDATE';

const updateBankAccounts = `UPDATE bank_accounts SET balance = ?,
            last_transaction = GREATEST(COALESCE(last_transaction, ?), ?) WHERE account_id = ?`;

const insertPayments = `INSERT INTO payments
                (document_id, transaction_id, payment_date, amount, payment_method,
                 payment_direction, payment_status, account_id, card_id, payroll_id, payroll_snapshot)
                VALUES (NULL, NULL, ?, ?, '계좌이체', '출금', '완료', ?, NULL, ?, ?)`;

const updatePayrolls = `UPDATE payrolls
                SET payment_status = '지급완료', payment_date = ?
                WHERE payroll_id = ? AND payment_status IN ('확정', '승인', '지급대기')`;

const selectPayments2 = `SELECT salary.payment_id, salary.payroll_id, salary.amount, salary.payroll_snapshot,
        DATE_FORMAT(salary.payment_date, '%Y-%m-%d') AS source_payment_date,
        e.name AS employee_name,
        DATE_FORMAT(receipt.payment_date, '%Y-%m-%d') AS deduction_payment_date,
        receipt.amount AS deduction_payment_amount, account.bank_name, account.account_name
        FROM payments salary
        LEFT JOIN payrolls payroll ON payroll.payroll_id = salary.payroll_id
        LEFT JOIN employees e ON e.employee_id = payroll.employee_id
        LEFT JOIN payments receipt ON receipt.payment_id =
            CAST(JSON_UNQUOTE(JSON_EXTRACT(salary.payroll_snapshot, '$.deduction_payment_id')) AS UNSIGNED)
        LEFT JOIN bank_accounts account ON account.account_id = receipt.account_id
        WHERE salary.payroll_id IS NOT NULL AND salary.payment_direction = '출금' AND salary.payment_status = '완료'
          AND JSON_UNQUOTE(JSON_EXTRACT(salary.payroll_snapshot, '$.pay_month')) = ?
        ORDER BY salary.payment_id`;

const selectEmployees2 = `SELECT e.department_id, ea.role
            FROM employees e INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
            WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`;

const selectPayments3 = `SELECT payment_id, payroll_id, amount, payroll_snapshot,
            DATE_FORMAT(payment_date, '%Y-%m-%d') AS source_payment_date
            FROM payments
            WHERE payroll_id IS NOT NULL AND payment_direction = '출금' AND payment_status = '완료'
              AND JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.pay_month')) = ?
            ORDER BY payment_id FOR UPDATE`;

const selectBankAccounts2 = 'SELECT balance, currency, account_status FROM bank_accounts WHERE account_id = ? FOR UPDATE';

const insertPayments2 = `INSERT INTO payments
            (document_id, transaction_id, payment_date, amount, payment_method, payment_direction,
             payment_status, account_id, card_id, payroll_id, payroll_snapshot)
            VALUES (NULL, NULL, ?, ?, '계좌이체', '출금', '완료', ?, NULL, NULL, ?)`;

const updateBankAccounts2 = `UPDATE bank_accounts SET balance = ?,
            last_transaction = GREATEST(COALESCE(last_transaction, ?), ?) WHERE account_id = ?`;

const updatePayments = `UPDATE payments SET payroll_snapshot = JSON_SET(payroll_snapshot,
                '$.deduction_status', '납부완료', '$.deduction_payment_id', ?,
                '$.deduction_payment_date', ?, '$.deduction_registered_by', ?)
                WHERE payment_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.deduction_status')) = '납부대기'`;

module.exports = {
    selectPayrolls,
    selectPayrolls2,
    selectEmployees,
    selectPayrolls3,
    selectPayments,
    selectTradeTransactions,
    selectBankAccounts,
    updateBankAccounts,
    insertPayments,
    updatePayrolls,
    selectPayments2,
    selectEmployees2,
    selectPayments3,
    selectBankAccounts2,
    insertPayments2,
    updateBankAccounts2,
    updatePayments
};
