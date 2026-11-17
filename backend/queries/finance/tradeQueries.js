// SQL definitions. Bind user input through ? parameters in the calling route.

const selectTradeItems = `
SELECT
i.item_id,
i.transaction_id,
t.partner_id,
t.trade_type,
DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date,
DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
COALESCE(t.company_name, p.company_name) AS company_name,
t.settlement_status,
i.item_name,
i.standard,
i.quantity,
i.unit_price,
i.supply_price,
i.vat,
(i.supply_price + i.vat) AS total_amount,
p.closing_day,
t.source_type AS linked_source_type,
t.source_id AS linked_source_id,
CASE WHEN c.category_code = 'expense_other_1' THEN 'unclassified'
     ELSE COALESCE(c.category_code, 'unclassified') END AS category_code
FROM trade_items i
INNER JOIN trade_transactions t
ON i.transaction_id=t.transaction_id
INNER JOIN partners p
ON t.partner_id=p.partner_id
LEFT JOIN finance_payment_classifications c
ON c.source_type = 'transaction' AND c.source_id = t.transaction_id
ORDER BY t.trade_date DESC, t.transaction_id DESC, i.item_id DESC
`;

const selectApprovalDocuments = 'SELECT amount, approval_status FROM approval_documents WHERE document_id = ? FOR UPDATE';

const selectPayments = "SELECT payment_id FROM payments WHERE document_id = ? LIMIT 1 FOR UPDATE";

const selectMyDraft = 'SELECT status FROM my_draft WHERE draft_id = ? FOR UPDATE';

const selectPayrolls = `SELECT p.payroll_id
        FROM payrolls p
        INNER JOIN my_draft d
          ON d.draft_id = ?
         AND d.document_type = '급여'
         AND JSON_UNQUOTE(JSON_EXTRACT(d.detail_data, '$.source')) = 'HR_PAYROLL'
         AND JSON_CONTAINS(JSON_EXTRACT(d.detail_data, '$.payrollIds'), JSON_ARRAY(p.payroll_id))
        LIMIT 1 FOR UPDATE`;

const selectDraftExpense = 'SELECT amount FROM draft_expense WHERE draft_id = ? FOR UPDATE';

const selectTradeTransactions = 'SELECT transaction_id FROM trade_transactions WHERE source_type = ? AND source_id = ? FOR UPDATE';

const selectPartners = "SELECT company_name FROM partners WHERE partner_id = ?";

const insertTradeTransactions = `INSERT INTO trade_transactions
        (partner_id, company_name, trade_type,
         trade_date, due_date, settlement_status, source_type, source_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const insertTradeItems = `INSERT INTO trade_items
                (transaction_id, item_name, standard,
                 quantity, unit_price, supply_price, vat)
             VALUES (?, ?, ?, ?, ?, ?, ?)`;

const insertFinancePaymentClassifications = `INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
                 SELECT 'transaction', ?, category_code FROM finance_payment_classifications
                 WHERE source_type = 'approval' AND source_id = ?`;

const insertFinancePaymentClassifications2 = `INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
                 VALUES ('transaction', ?, ?) ON DUPLICATE KEY UPDATE category_code = VALUES(category_code)`;

const selectFinancePaymentClassifications = "SELECT category_code FROM finance_payment_classifications WHERE source_type = 'transaction' AND source_id = ?";

const selectTradeItems2 = `SELECT
                i.transaction_id,
                t.partner_id,
                t.source_type,
                t.trade_type,
                DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date
             FROM trade_items i
             INNER JOIN trade_transactions t
                ON i.transaction_id = t.transaction_id
             WHERE i.item_id = ?
             FOR UPDATE`;

const selectTradeItems3 = 'SELECT SUM(supply_price + vat) AS approved_total FROM trade_items WHERE transaction_id = ?';

const selectPayments2 = `SELECT payment_id
             FROM payments
             WHERE transaction_id = ?
             LIMIT 1`;

const selectTradeItems4 = `SELECT COUNT(*) AS item_count
             FROM trade_items
             WHERE transaction_id = ?`;

const selectPartners2 = "SELECT company_name FROM partners WHERE partner_id = ?";

const updateTradeTransactions = `UPDATE trade_transactions
         SET partner_id = ?,
             company_name = ?,
             trade_type = ?,
             trade_date = ?,
             due_date = ?
         WHERE transaction_id = ?`;

const updateTradeItems = `UPDATE trade_items
             SET item_name = ?,
                 standard = ?,
                 quantity = ?,
                 unit_price = ?,
                 supply_price = ?,
                 vat = ?
             WHERE item_id = ?`;

const insertFinancePaymentClassifications3 = `INSERT INTO finance_payment_classifications (source_type, source_id, category_code)
                 VALUES ('transaction', ?, ?) ON DUPLICATE KEY UPDATE category_code = VALUES(category_code)`;

const selectTradeItems5 = `SELECT
        i.transaction_id,
        t.partner_id,
        t.trade_type,
        DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date,
        DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date
        FROM trade_items i
        INNER JOIN trade_transactions t
        ON i.transaction_id = t.transaction_id
        WHERE i.item_id = ?
        FOR UPDATE`;

const selectPayments3 = `SELECT payment_id
             FROM payments
             WHERE transaction_id = ?
             LIMIT 1`;

const deleteTradeItems = "DELETE FROM trade_items WHERE item_id = ?";

const selectTradeItems6 = `SELECT COUNT(*) AS item_count
             FROM trade_items
             WHERE transaction_id = ?`;

const deleteFinancePaymentClassifications = "DELETE FROM finance_payment_classifications WHERE source_type = 'transaction' AND source_id = ?";

const deleteTradeTransactions = `DELETE FROM trade_transactions
                 WHERE transaction_id = ?`;

const selectTradeTransactions2 = `SELECT trade_type
                 FROM trade_transactions
                 WHERE transaction_id = ?
                 FOR UPDATE`;

const selectTradeItems7 = `SELECT
                    COUNT(*) AS item_count,
                    COALESCE(SUM(supply_price + vat), 0) AS total_amount
                 FROM trade_items
                 WHERE transaction_id = ?`;

const selectPayments4 = `SELECT COALESCE(SUM(amount), 0) AS paid_amount
                 FROM payments
                 WHERE transaction_id = ?
                   AND payment_direction = ?
                   AND payment_status = '완료'`;

const selectBankAccounts = `SELECT balance, currency, account_status
         FROM bank_accounts
         WHERE account_id = ?
         FOR UPDATE`;

const updateBankAccounts = `UPDATE bank_accounts
         SET balance = ?,
             last_transaction = GREATEST(
                 COALESCE(last_transaction, ?),
                 ?
             )
         WHERE account_id = ?`;

const selectCorporateCards = `SELECT monthly_usage, monthly_limit, remaining_limit, card_status
                     FROM corporate_cards
                     WHERE card_id = ?
                     FOR UPDATE`;

const updateCorporateCards = `UPDATE corporate_cards
                     SET monthly_usage = ?, remaining_limit = ?
                     WHERE card_id = ?`;

const insertPayments = `INSERT INTO payments
                (transaction_id, payment_date, amount,
                payment_method, payment_direction, payment_status,
                account_id, card_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const updateTradeTransactions2 = `UPDATE trade_transactions
                 SET settlement_status = ?
                 WHERE transaction_id = ?`;

const setSummary = "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ";

const selectTradeTransactions3 = `SELECT
                    transaction_id,
                    company_name,
                    trade_type,
                    settlement_status
                 FROM trade_transactions
                 WHERE transaction_id = ?`;

const selectTradeItems8 = `SELECT
                    COUNT(*) AS item_count,
                    COALESCE(SUM(supply_price + vat), 0) AS total_amount
                 FROM trade_items
                 WHERE transaction_id = ?`;

const selectPayments5 = `SELECT
                    payment_id,
                    DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
                    amount,
                    payment_method,
                    payment_direction,
                    payment_status,
                    account_id,
                    card_id
                 FROM payments
                 WHERE transaction_id = ?
                 ORDER BY payment_date DESC, payment_id DESC`;

module.exports = {
    selectTradeItems,
    selectApprovalDocuments,
    selectPayments,
    selectMyDraft,
    selectPayrolls,
    selectDraftExpense,
    selectTradeTransactions,
    selectPartners,
    insertTradeTransactions,
    insertTradeItems,
    insertFinancePaymentClassifications,
    insertFinancePaymentClassifications2,
    selectFinancePaymentClassifications,
    selectTradeItems2,
    selectTradeItems3,
    selectPayments2,
    selectTradeItems4,
    selectPartners2,
    updateTradeTransactions,
    updateTradeItems,
    insertFinancePaymentClassifications3,
    selectTradeItems5,
    selectPayments3,
    deleteTradeItems,
    selectTradeItems6,
    deleteFinancePaymentClassifications,
    deleteTradeTransactions,
    selectTradeTransactions2,
    selectTradeItems7,
    selectPayments4,
    selectBankAccounts,
    updateBankAccounts,
    selectCorporateCards,
    updateCorporateCards,
    insertPayments,
    updateTradeTransactions2,
    setSummary,
    selectTradeTransactions3,
    selectTradeItems8,
    selectPayments5
};
