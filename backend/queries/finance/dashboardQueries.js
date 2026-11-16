// SQL definitions. Bind user input through ? parameters in the calling route.

function coalesceSummary(value0, value1, value2, value3) {
    return `COALESCE(SUM(CASE WHEN ${value0} >= ? AND ${value1} < ? THEN ${value2} ELSE 0 END), 0) AS ${value3}_amount`;
}

function fromApprovalDocuments(value0) {
    return `
        FROM approval_documents a
        LEFT JOIN (
            SELECT document_id, SUM(amount) AS paid
            FROM (${value0}) source_payments
            GROUP BY document_id
        ) paid ON paid.document_id = a.document_id`;
}

const greatestSummary = 'GREATEST(a.amount - COALESCE(paid.paid, 0), 0)';

const selectCorporateCards = `SELECT
            (SELECT COUNT(*) FROM corporate_cards) AS cards,
            (SELECT COUNT(*) FROM bank_accounts) AS accounts,
            (SELECT COUNT(*) FROM approval_documents WHERE approval_status = '대기') AS approvals,
            (SELECT COUNT(*) FROM partners) AS partners,
            (SELECT COUNT(*) FROM trade_items) AS items`;

function selectPayments(value0) {
    return `SELECT ${value0}
            FROM payments WHERE payment_status = '완료' AND payment_direction = '출금'`;
}

function selectSummary(value0, value1) {
    return `SELECT ${value0}
            ${value1} WHERE a.approval_status = '승인'`;
}

function selectSummary2(value0, value1, value2) {
    return `SELECT a.document_id, a.title,
            DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
            ${value0} AS remaining_amount
            ${value1}
            WHERE a.approval_status = '승인' AND a.due_date IS NOT NULL
                AND ${value2} > 0
            ORDER BY a.due_date, a.document_id`;
}

function selectApprovalDocuments(value0) {
    return `
        SELECT
            a.document_id,
            a.title,
            a.content,
            a.document_type,
            a.approval_status,
            a.amount,
            DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
            e.name AS requester_name,
            d.department_name,
            COALESCE(p.paid_amount, 0) AS paid_amount,
            GREATEST(
                a.amount - COALESCE(p.paid_amount, 0),
                0
            ) AS remaining_amount
        FROM approval_documents a
        LEFT JOIN employees e
            ON a.employee_id = e.employee_id
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        LEFT JOIN (
            SELECT document_id, SUM(amount) AS paid_amount
            FROM (${value0}) source_payments
            GROUP BY document_id
        ) p ON a.document_id = p.document_id
        WHERE a.document_id = ?
          AND a.approval_status = '승인'
          AND a.due_date IS NOT NULL
    `;
}

module.exports = {
    coalesceSummary,
    fromApprovalDocuments,
    greatestSummary,
    selectCorporateCards,
    selectPayments,
    selectSummary,
    selectSummary2,
    selectApprovalDocuments
};
