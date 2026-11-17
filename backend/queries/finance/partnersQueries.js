// SQL definitions. Bind user input through ? parameters in the calling route.

const selectPartners = `
SELECT
p.*,
COALESCE(b.receivable_amount, 0) AS receivable_amount,
COALESCE(b.payable_amount, 0) AS payable_amount,
COALESCE(b.missing_items, 0) AS missing_items
FROM partners p
LEFT JOIN (
SELECT
t.partner_id,
SUM(CASE WHEN t.trade_type='매출'
THEN i.total_amount - COALESCE(pay.income_amount, 0)
ELSE 0 END) AS receivable_amount,
SUM(CASE WHEN t.trade_type='매입'
THEN i.total_amount - COALESCE(pay.expense_amount, 0)
ELSE 0 END) AS payable_amount,
SUM(CASE WHEN i.transaction_id IS NULL THEN 1 ELSE 0 END) AS missing_items
FROM trade_transactions t
LEFT JOIN (
SELECT transaction_id, SUM(supply_price + vat) AS total_amount
FROM trade_items
GROUP BY transaction_id
) i ON t.transaction_id=i.transaction_id
LEFT JOIN (
SELECT
transaction_id,
SUM(CASE WHEN payment_direction='입금' THEN amount ELSE 0 END) AS income_amount,
SUM(CASE WHEN payment_direction='출금' THEN amount ELSE 0 END) AS expense_amount
FROM payments
WHERE payment_status='완료'
GROUP BY transaction_id
) pay ON t.transaction_id=pay.transaction_id
GROUP BY t.partner_id
) b ON p.partner_id=b.partner_id
ORDER BY p.partner_id DESC
`;

const selectTradeTransactions = `
SELECT t.transaction_id,
DATE_FORMAT(t.trade_date, '%Y-%m-%d') AS trade_date,
DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
i.total_amount, COALESCE(pay.paid_amount, 0) AS paid_amount,
i.total_amount - COALESCE(pay.paid_amount, 0) AS remaining_amount
FROM trade_transactions t
LEFT JOIN (
  SELECT transaction_id, SUM(supply_price + vat) AS total_amount
  FROM trade_items GROUP BY transaction_id
) i ON i.transaction_id = t.transaction_id
LEFT JOIN (
  SELECT transaction_id, SUM(amount) AS paid_amount
  FROM payments WHERE payment_status = '완료' AND payment_direction = ?
  GROUP BY transaction_id
) pay ON pay.transaction_id = t.transaction_id
WHERE t.partner_id = ? AND t.trade_type = ?
ORDER BY t.trade_date DESC, t.transaction_id DESC`;

const insertPartners = `
INSERT INTO partners (
company_name, tax_id, representative_name, company_phone,
company_address, memo, trade_role, company_type,
closing_day, bank_name, account_number, account_holder, calendar_type_id
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const selectPartners2 = "SELECT partner_id FROM partners WHERE partner_id = ?";

const updatePartners = `
UPDATE partners
SET company_name=?, tax_id=?, representative_name=?, company_phone=?,
company_address=?, memo=?, trade_role=?, company_type=?,
closing_day=?, bank_name=?, account_number=?, account_holder=?,
calendar_type_id=IF(?, ?, calendar_type_id)
WHERE partner_id=?
`;

const deletePartners = "DELETE FROM partners WHERE partner_id = ?";

module.exports = {
    selectPartners,
    selectTradeTransactions,
    insertPartners,
    selectPartners2,
    updatePartners,
    deletePartners
};
