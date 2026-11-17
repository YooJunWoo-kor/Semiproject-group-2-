// SQL definitions. Bind user input through ? parameters in the calling route.

const selectFinanceDocuments = `SELECT CAST(f.doc_id AS CHAR) AS doc_id,
    f.document_number, f.document_type, f.employee_id, f.partner_id,
    DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date,
    DATE_FORMAT(f.due_date, '%Y-%m-%d') AS due_date,
    f.currency, CAST(f.total_amount AS CHAR) AS total_amount, f.snapshot_json,
    DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM finance_documents f`;

const fSummary = 'f.document_type = ?';

const querySummary = `(INSTR(f.document_number, ?) > 0 OR INSTR(JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.data.customer.name')), ?) > 0 OR INSTR(JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.author.name')), ?) > 0)`;

function whereSummary(value0) {
    return ` WHERE ${value0}`;
}

function selectFinanceDocuments2(value0) {
    return `SELECT COUNT(*) AS total FROM finance_documents f${value0}`;
}

function selectFinanceDocuments3(value0) {
    return `SELECT CAST(f.doc_id AS CHAR) AS doc_id, f.document_number, f.document_type,
            DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date, f.currency, CAST(f.total_amount AS CHAR) AS total_amount,
            JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.data.customer.name')) AS customer_name,
            JSON_UNQUOTE(JSON_EXTRACT(f.snapshot_json, '$.author.name')) AS employee_name,
            DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
            FROM finance_documents f${value0} ORDER BY f.doc_id DESC LIMIT ? OFFSET ?`;
}

function whereSummary2(value0) {
    return `${value0} WHERE f.doc_id = ?`;
}

const selectEmployees = 'SELECT employee_id, name FROM employees WHERE employee_id = ?';

const selectPartners = 'SELECT partner_id FROM partners WHERE partner_id = ?';

const insertFinanceDocuments = `INSERT INTO finance_documents
            (document_number, document_type, employee_id, partner_id, issue_date, due_date, currency, total_amount, snapshot_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const updateFinanceDocuments = 'UPDATE finance_documents SET document_number = ?, snapshot_json = ? WHERE doc_id = ?';

function whereSummary3(value0) {
    return `${value0} WHERE f.doc_id = ?`;
}

module.exports = {
    selectFinanceDocuments,
    fSummary,
    querySummary,
    whereSummary,
    selectFinanceDocuments2,
    selectFinanceDocuments3,
    whereSummary2,
    selectEmployees,
    selectPartners,
    insertFinanceDocuments,
    updateFinanceDocuments,
    whereSummary3
};
