// SQL definitions. Bind user input through ? parameters in the calling route.

const selectBankAccounts = `
        SELECT
            b.account_id,
            b.account_number,
            b.bank_name,
            b.account_name,
            b.account_type,
            b.balance,
            b.currency,
            b.employee_id,
            e.name AS manager_name,
            DATE_FORMAT(
                b.last_transaction,
                '%Y-%m-%d %H:%i'
            ) AS last_transaction,
            b.account_status
        FROM bank_accounts b
        LEFT JOIN employees e
            ON b.employee_id = e.employee_id
        ORDER BY b.account_id DESC
    `;

const selectBankAccounts2 = "SELECT account_id FROM bank_accounts WHERE account_id = ?";

function selectPayments(value0) {
    return `
                SELECT
                    p.payment_id,
                    p.transaction_id,
                    p.document_id,
                    DATE_FORMAT(
                        p.payment_date,
                        '%Y-%m-%d'
                    ) AS payment_date,
                    p.amount,
                    p.payment_method,
                    p.payment_direction,
                    p.payment_status,
                    COALESCE(t.company_name, CONCAT(payroll_link.pay_month, ' 급여'), CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'payroll_deduction' THEN CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.pay_month')), ' 급여 공제액 납부') END) AS company_name
                FROM payments p
                LEFT JOIN trade_transactions t
                    ON p.transaction_id = t.transaction_id
                LEFT JOIN (${value0}) payroll_link ON payroll_link.payment_id = p.payment_id
                WHERE p.account_id = ?
                ORDER BY p.payment_date DESC, p.payment_id DESC
            `;
}

const insertBankAccounts = `
        INSERT INTO bank_accounts (
            account_number,
            bank_name,
            account_name,
            account_type,
            balance,
            currency,
            employee_id,
            account_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

const updateBankAccounts = `
    UPDATE bank_accounts
    SET account_number = ?,
        bank_name = ?,
        account_name = ?,
        account_type = ?,
        employee_id = ?
    WHERE account_id = ?
`;

const selectEmployeeAccounts = `
        SELECT
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            d.department_name,
            EXISTS (
                SELECT 1 FROM employee_accounts ea
                WHERE ea.employee_id = e.employee_id
                  AND ea.account_status = 'ACTIVE'
                  AND (
                      EXISTS (
                          SELECT 1 FROM departments finance_department
                          WHERE finance_department.department_id = e.department_id
                            AND finance_department.department_name LIKE '재무%'
                      )
                      OR ea.role = 'MASTER'
                  )
            ) AS can_approve
        FROM employees e
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        ORDER BY e.name, e.employee_id
    `;

const selectCorporateCards = `
        SELECT
            c.card_id,
            c.card_name,
            c.department_id,
            d.department_name,
            c.employee_id,
            e.name AS manager_name,
            c.monthly_usage,
            c.monthly_limit,
            c.remaining_limit,
            c.card_status
        FROM corporate_cards c
        LEFT JOIN departments d
            ON c.department_id = d.department_id
        LEFT JOIN employees e
            ON c.employee_id = e.employee_id
        ORDER BY c.card_id DESC
    `;

const updateCorporateCards = `
      UPDATE corporate_cards
      SET
        monthly_limit = ?,
        remaining_limit = ? - COALESCE(monthly_usage, 0)
      WHERE card_id = ?
        AND COALESCE(monthly_usage, 0) BETWEEN 0 AND ?
    `;

const selectCorporateCards2 = "SELECT card_id FROM corporate_cards WHERE card_id = ?";

const selectPayments2 = `
          SELECT
            p.payment_id,
            p.transaction_id,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
            t.company_name,
            p.amount,
            p.payment_method,
            p.payment_direction,
            p.payment_status
          FROM payments p
          LEFT JOIN trade_transactions t
            ON p.transaction_id = t.transaction_id
          WHERE p.card_id = ?
          ORDER BY p.payment_date DESC, p.payment_id DESC
        `;

const insertCorporateCards = `
      INSERT INTO corporate_cards (
        card_name,
        department_id,
        employee_id,
        monthly_usage,
        monthly_limit,
        remaining_limit,
        card_status
      )
      VALUES (?, ?, ?, 0, ?, ?, '사용')
    `;

const selectDepartments = `SELECT department_id, department_name
       FROM departments
       ORDER BY department_name, department_id`;

const selectEmployees = `SELECT e.employee_id, e.employee_number, e.name, d.department_name
           FROM employees e
           LEFT JOIN departments d ON e.department_id = d.department_id
           ORDER BY e.name, e.employee_id`;

const updateCorporateCards2 = `
      UPDATE corporate_cards
      SET
        card_name = ?,
        department_id = ?,
        employee_id = ?
      WHERE card_id = ?
    `;

const updateCorporateCards3 = `UPDATE corporate_cards
       SET card_status = ?
       WHERE card_id = ?`;

const updateBankAccounts2 = `UPDATE bank_accounts
       SET account_status = ?
       WHERE account_id = ?`;

module.exports = {
    selectBankAccounts,
    selectBankAccounts2,
    selectPayments,
    insertBankAccounts,
    updateBankAccounts,
    selectEmployeeAccounts,
    selectCorporateCards,
    updateCorporateCards,
    selectCorporateCards2,
    selectPayments2,
    insertCorporateCards,
    selectDepartments,
    selectEmployees,
    updateCorporateCards2,
    updateCorporateCards3,
    updateBankAccounts2
};
