// SQL definitions. Bind user input through ? parameters in the calling route.

const selectPayments = `
    SELECT payment_id, payroll_id,
    JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.pay_month')) AS pay_month,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.employee_id')) AS UNSIGNED) AS employee_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.draft_id')) AS UNSIGNED) AS draft_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.base_amount')) AS UNSIGNED) AS base_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.allowance_amount')) AS UNSIGNED) AS allowance_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.bonus_amount')) AS UNSIGNED) AS bonus_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.other_payment_amount')) AS UNSIGNED) AS other_payment_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.gross_amount')) AS UNSIGNED) AS gross_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.deduction_amount')) AS UNSIGNED) AS deduction_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.net_amount')) AS UNSIGNED) AS net_amount,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.registered_by')) AS UNSIGNED) AS registered_by,
    JSON_UNQUOTE(JSON_EXTRACT(payroll_snapshot, '$.deduction_status')) AS deduction_status
    FROM payments
    WHERE payroll_id IS NOT NULL AND payment_status = '완료' AND payment_direction = '출금'
`;

const selectPayments2 = `
    SELECT document_id, amount FROM payments
    WHERE document_id IS NOT NULL AND payment_status = '완료' AND payment_direction = '출금'
    UNION ALL
    SELECT link.source_id AS document_id, p.amount
    FROM payments p
    INNER JOIN trade_transactions link ON link.transaction_id = p.transaction_id AND link.source_type = 'approval'
    WHERE p.payment_status = '완료' AND p.payment_direction = '출금'`;

module.exports = {
    selectPayments,
    selectPayments2: `SELECT document_id, amount FROM payments
        WHERE document_id IS NOT NULL AND payment_status = '완료' AND payment_direction = '출금'`
};
