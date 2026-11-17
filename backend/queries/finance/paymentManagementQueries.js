// SQL definitions. Bind user input through ? parameters in the calling route.

const setSummary = 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ';

function selectPayments(value0) {
    return `SELECT p.payment_id, p.document_id, p.transaction_id,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
            p.amount, p.payment_method, p.payment_status,
            COALESCE(a.title, t.company_name, CONCAT(payroll_link.pay_month, ' 월급 (인건비)'), CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'payroll_deduction' THEN CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.pay_month')), ' 급여 공제액 납부') END, '연결 문서 없는 입출금') AS title,
            CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'payroll_deduction' THEN 'payroll_deduction'
                 WHEN payroll_link.payroll_id IS NOT NULL THEN 'payroll'
                 WHEN p.document_id IS NOT NULL THEN 'approval'
                 WHEN p.transaction_id IS NOT NULL THEN 'transaction' ELSE 'payment' END AS source_type,
            CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'payroll_deduction' THEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.pay_month'))
                 WHEN payroll_link.payroll_id IS NOT NULL THEN payroll_link.pay_month
                 ELSE COALESCE(p.document_id, p.transaction_id, p.payment_id) END AS source_id,
            CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'payroll_deduction' OR payroll_link.payroll_id IS NOT NULL THEN 'expense_administration_1'
                 ELSE c.category_code END AS category_code
            FROM payments p
            LEFT JOIN (${value0}) payroll_link ON payroll_link.payment_id = p.payment_id
            LEFT JOIN approval_documents a ON a.document_id = p.document_id
            LEFT JOIN trade_transactions t ON t.transaction_id = p.transaction_id
            LEFT JOIN finance_payment_classifications c ON c.source_type =
                CASE WHEN p.document_id IS NOT NULL THEN 'approval'
                     WHEN p.transaction_id IS NOT NULL THEN 'transaction' ELSE 'payment' END
                AND c.source_id = COALESCE(p.document_id, p.transaction_id, p.payment_id)
            WHERE p.payment_direction = ? AND p.payment_status = '완료'
              AND p.payment_date >= ? AND p.payment_date < ?
            ORDER BY p.payment_date DESC, p.payment_id DESC`;
}

const selectApprovalDocuments = `SELECT a.document_id AS source_id, 'approval' AS source_type,
                a.title, DATE_FORMAT(COALESCE(a.due_date, a.created_at), '%Y-%m-%d') AS payment_date,
                GREATEST(a.amount - COALESCE(p.paid, 0), 0) AS amount, c.category_code
                FROM approval_documents a
                LEFT JOIN (SELECT document_id, SUM(amount) AS paid FROM payments
                    WHERE payment_status = '완료' AND payment_direction = '출금' GROUP BY document_id) p
                    ON p.document_id = a.document_id
                LEFT JOIN finance_payment_classifications c ON c.source_type = 'approval' AND c.source_id = a.document_id
                WHERE a.approval_status = '승인' AND NOT EXISTS (SELECT 1 FROM trade_transactions link WHERE link.source_type = 'approval' AND link.source_id = a.document_id) AND COALESCE(a.due_date, a.created_at) >= ?
                    AND COALESCE(a.due_date, a.created_at) < ?
                HAVING amount > 0`;

const selectTradeTransactions = `SELECT t.transaction_id AS source_id, 'transaction' AS source_type,
            t.company_name AS title, DATE_FORMAT(COALESCE(t.due_date, t.trade_date), '%Y-%m-%d') AS payment_date,
            GREATEST(i.total - COALESCE(p.paid, 0), 0) AS amount, c.category_code
            FROM trade_transactions t
            INNER JOIN (SELECT transaction_id, SUM(supply_price + vat) AS total FROM trade_items GROUP BY transaction_id) i
                ON i.transaction_id = t.transaction_id
            LEFT JOIN (SELECT transaction_id, SUM(amount) AS paid FROM payments
                WHERE payment_status = '완료' AND payment_direction = ? GROUP BY transaction_id) p
                ON p.transaction_id = t.transaction_id
            LEFT JOIN finance_payment_classifications c ON c.source_type = 'transaction' AND c.source_id = t.transaction_id
            WHERE t.trade_type = ? AND COALESCE(t.due_date, t.trade_date) >= ?
                AND COALESCE(t.due_date, t.trade_date) < ? HAVING amount > 0`;

const selectPayrolls = `
                SELECT p.pay_month AS source_id, 'payroll' AS source_type,
                    CONCAT(p.pay_month, ' 월급 (인건비)') AS title,
                    CONCAT(p.pay_month, '-01') AS payment_date,
                    SUM(p.gross_pay) AS amount,
                    'expense_administration_1' AS category_code
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
                  AND p.pay_month = ?
                  AND COALESCE(p.payment_status, '') <> '지급완료'
                  AND NOT EXISTS (
                      SELECT 1 FROM trade_transactions t
                      WHERE t.source_type = 'draft' AND t.source_id = d.draft_id
                  )
                GROUP BY p.pay_month
                HAVING SUM(p.gross_pay) > 0
            `;

function selectSummary(value0) {
    return `SELECT pay_month AS source_id,
                'payroll_deduction' AS source_type,
                CONCAT(pay_month, ' 급여 공제액 (별도 납부)') AS title,
                CONCAT(pay_month, '-01') AS payment_date,
                SUM(deduction_amount) AS amount,
                'expense_administration_1' AS category_code
                FROM (${value0}) payroll_history
                WHERE pay_month = ? AND deduction_status = '납부대기'
                GROUP BY pay_month HAVING SUM(deduction_amount) > 0`;
}

const selectEmployees = `SELECT e.department_id, ea.role FROM employees e
            INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
            WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`;

const selectApprovalDocuments2 = "SELECT '출금' AS direction FROM approval_documents WHERE document_id = ? FOR UPDATE";

const selectTradeTransactions2 = "SELECT CASE WHEN trade_type = '매출' THEN '입금' ELSE '출금' END AS direction FROM trade_transactions WHERE transaction_id = ? FOR UPDATE";

const selectPayments2 = 'SELECT payment_direction AS direction FROM payments WHERE payment_id = ? AND document_id IS NULL AND transaction_id IS NULL FOR UPDATE';

const insertFinancePaymentClassifications = `INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
            VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE category_code = VALUES(category_code)`;

module.exports = {
    setSummary,
    selectPayments,
    selectApprovalDocuments,
    selectTradeTransactions,
    selectPayrolls,
    selectSummary,
    selectEmployees,
    selectApprovalDocuments2,
    selectTradeTransactions2,
    selectPayments2,
    insertFinancePaymentClassifications
};
