// SQL definitions. Bind user input through ? parameters in the calling route.

const selectApprovalDocuments = `
      SELECT
        a.document_id,
        a.employee_id,
        e.name AS requester_name,
        d.department_name,
        a.title,
        a.content,
        a.amount,
        DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
        a.approval_status,
        a.document_type,
        DATE_FORMAT(
          a.created_at, '%Y-%m-%d %H:%i'
        ) AS created_at,
        p.payment_methods,
        (SELECT COUNT(*) FROM finance_approval_attachments f WHERE f.document_id = a.document_id) AS attachment_count,
        source_link.transaction_id AS linked_transaction_id
      FROM approval_documents a
  
      LEFT JOIN employees e
        ON a.employee_id = e.employee_id
  
      LEFT JOIN departments d
        ON e.department_id = d.department_id
  
      LEFT JOIN (
        SELECT
          document_id,
          GROUP_CONCAT(
            DISTINCT payment_method
            ORDER BY payment_method
            SEPARATOR ', '
          ) AS payment_methods
        FROM payments
        WHERE payment_status = '완료'
        GROUP BY document_id
      ) p
        ON a.document_id = p.document_id
  
      LEFT JOIN trade_transactions source_link
        ON source_link.source_type = 'approval' AND source_link.source_id = a.document_id
      ORDER BY a.created_at DESC, a.document_id DESC
    `;

const selectPayrolls = `
          SELECT m.*,
                 DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i') AS created_at,
                 e.name AS requester_name, d.department_name, expense.expense_amount, source_link.transaction_id AS linked_transaction_id,
                 EXISTS (SELECT 1 FROM payrolls payroll WHERE payroll.draft_id = m.draft_id) AS is_payroll_draft,
                 (SELECT SUM(payroll.gross_pay) FROM payrolls payroll WHERE payroll.draft_id = m.draft_id) AS payroll_amount,
                 (SELECT GROUP_CONCAT(DISTINCT payroll.pay_month ORDER BY payroll.pay_month)
                    FROM payrolls payroll WHERE payroll.draft_id = m.draft_id) AS payroll_months
          FROM my_draft m
          LEFT JOIN employees e ON m.employee_id = e.employee_id
          LEFT JOIN departments d ON e.department_id = d.department_id
          LEFT JOIN (
            SELECT draft_id, SUM(amount) AS expense_amount
            FROM draft_expense
            GROUP BY draft_id
          ) expense ON expense.draft_id = m.draft_id
          LEFT JOIN trade_transactions source_link ON source_link.source_type = 'draft' AND source_link.source_id = m.draft_id
          WHERE m.status IN ('APPROVED', 'PENDING', 'WAITING', 'IN_PROGRESS', 'REJECTED', '승인', '대기', '승인대기', '결재대기', '진행중', '반려')
            AND m.document_type NOT IN ('추가급여', '수당', '상여금')
            AND (m.document_type LIKE '%구매%' OR m.document_type LIKE '%비용%'
                 OR expense.draft_id IS NOT NULL
                 OR EXISTS (SELECT 1 FROM payrolls payroll WHERE payroll.draft_id = m.draft_id))
          ORDER BY m.created_at DESC, m.draft_id DESC
        `;

const selectApprovalDocuments2 = "SELECT document_id FROM approval_documents WHERE document_id = ?";

const selectApprovalSteps = `
          SELECT
            s.step_id,
            s.step_order,
            s.document_id,
            s.employee_id,
            e.name AS approver_name,
            d.department_name,
            s.step_status,
            DATE_FORMAT(
              s.action_at, '%Y-%m-%d %H:%i'
            ) AS action_at,
            s.opinion
          FROM approval_steps s
          LEFT JOIN employees e
            ON s.employee_id = e.employee_id
          LEFT JOIN departments d
            ON e.department_id = d.department_id
          WHERE s.document_id = ?
          ORDER BY s.step_order, s.step_id
        `;

const selectEmployees = `SELECT e.employee_id
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.account_status = 'ACTIVE'
               AND (e.department_id = 1 OR ea.role = 'MASTER')
             FOR UPDATE`;

const insertApprovalDocuments = `INSERT INTO approval_documents (
          employee_id,
          title,
          content,
          amount,
          due_date,
          approval_status,
          document_type
        )
        VALUES (?, ?, ?, ?, ?, '대기', ?)`;

const insertFinancePaymentClassifications = "INSERT INTO finance_payment_classifications (source_type, source_id, category_code) VALUES ('approval', ?, ?)";

const insertApprovalSteps = `INSERT INTO approval_steps (
          step_order,
          document_id,
          employee_id,
          step_status
        )
        VALUES (1, ?, ?, '대기')`;

const selectEmployeeAccounts = `SELECT employee_id FROM employee_accounts
             WHERE employee_id = ? AND password_hash = ? AND account_status = 'ACTIVE'`;

const selectEmployees2 = `SELECT e.employee_id
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.account_status = 'ACTIVE'
               AND (e.department_id = 1 OR ea.role = 'MASTER')
             FOR UPDATE`;

const selectApprovalDocuments3 = 'SELECT document_id, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE';

const selectApprovalSteps2 = `SELECT step_id, step_order, employee_id, step_status FROM approval_steps
             WHERE document_id = ? ORDER BY step_order, step_id FOR UPDATE`;

const updateApprovalSteps = `UPDATE approval_steps SET step_status = ?, opinion = ?, action_at = NOW()
             WHERE step_id = ? AND step_status = '대기'`;

const updateApprovalDocuments = 'UPDATE approval_documents SET approval_status = ? WHERE document_id = ?';

const selectApprovalDocuments4 = `
        SELECT
            a.document_id,
            a.approval_status,
            a.amount AS document_amount,
            COALESCE(SUM(p.amount), 0) AS paid_amount,
            a.amount - COALESCE(SUM(p.amount), 0) AS remaining_amount
        FROM approval_documents a
        LEFT JOIN payments p
            ON a.document_id = p.document_id
            AND p.payment_direction = '출금'
            AND p.payment_status = '완료'
        WHERE a.document_id = ?
        GROUP BY
            a.document_id,
            a.approval_status,
            a.amount
    `;

const selectPayments = `
            SELECT
                payment_id,
                document_id,
                transaction_id,
                DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
                amount,
                payment_method,
                account_id,
                card_id,
                payment_direction,
                payment_status
            FROM payments
            WHERE document_id = ?
            ORDER BY payment_date DESC, payment_id DESC
        `;

const selectEmployees3 = `SELECT e.employee_id, e.department_id, ea.role
             FROM employees e
             INNER JOIN employee_accounts ea ON ea.employee_id = e.employee_id
             WHERE e.employee_id = ? AND ea.password_hash = ? AND ea.account_status = 'ACTIVE'`;

const selectApprovalDocuments5 = 'SELECT document_id, amount, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE';

const selectTradeTransactions = "SELECT transaction_id FROM trade_transactions WHERE source_type = 'approval' AND source_id = ? FOR UPDATE";

const selectPayments2 = `SELECT payment_id, amount FROM payments
             WHERE document_id = ? AND payment_direction = '출금' AND payment_status = '완료'
             FOR UPDATE`;

const selectBankAccounts = 'SELECT balance, currency, account_status FROM bank_accounts WHERE account_id = ? FOR UPDATE';

const updateBankAccounts = `UPDATE bank_accounts SET balance = ?,
                 last_transaction = GREATEST(COALESCE(last_transaction, ?), ?)
                 WHERE account_id = ?`;

const selectCorporateCards = `SELECT monthly_usage, monthly_limit, remaining_limit, card_status
                 FROM corporate_cards WHERE card_id = ? FOR UPDATE`;

const updateCorporateCards = 'UPDATE corporate_cards SET monthly_usage = ?, remaining_limit = ? WHERE card_id = ?';

const insertPayments = `INSERT INTO payments
             (document_id, transaction_id, payment_date, amount, payment_method,
              account_id, card_id, payment_direction, payment_status)
             VALUES (?, NULL, ?, ?, ?, ?, ?, '출금', '완료')`;

module.exports = {
    selectApprovalDocuments,
    selectPayrolls,
    selectApprovalDocuments2,
    selectApprovalSteps,
    selectEmployees,
    insertApprovalDocuments,
    insertFinancePaymentClassifications,
    insertApprovalSteps,
    selectEmployeeAccounts,
    selectEmployees2,
    selectApprovalDocuments3,
    selectApprovalSteps2,
    updateApprovalSteps,
    updateApprovalDocuments,
    selectApprovalDocuments4,
    selectPayments,
    selectEmployees3,
    selectApprovalDocuments5,
    selectTradeTransactions,
    selectPayments2,
    selectBankAccounts,
    updateBankAccounts,
    selectCorporateCards,
    updateCorporateCards,
    insertPayments
};
