// 추가급여는 월급과 분리하고, 원본 승인 기안서를 지급의 기준으로 사용합니다.
const types = ['추가급여', '수당', '상여금'];
function fail(message, status = 409) { const error = new Error(message); error.status = status; throw error; }
function parse(value) {
    if (Buffer.isBuffer(value)) value = value.toString('utf8');
    if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } }
    return value && typeof value === 'object' ? value : {};
}
function validateAdditionalPayroll({ draft }) {
    const detail = parse(draft.detailData);
    const amount = Number(detail.amount);
    if (!types.includes(draft.documentType) || !Number.isSafeInteger(amount) || amount <= 0 ||
        !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(detail.payMonth || '')) fail('추가급여의 급여월과 신청 금액을 확인해주세요.');
    if (draft.documentType === '추가급여' && !['수당', '상여', '상여금'].includes(detail.paymentType)) fail('추가급여 지급 구분을 확인해주세요.');
    if (detail.hrPayrollApplication) fail('이미 월급에 합산된 기안입니다. 월급 지급 이력을 먼저 확인해주세요.');
    for (const key of ['recipientEmployeeId', 'targetEmployeeId']) {
        if (detail[key] != null && Number(detail[key]) !== Number(draft.employeeId)) fail('본인의 추가급여만 신청할 수 있습니다.');
    }
    if (detail.paymentDate) {
        const date = new Date(`${detail.paymentDate}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(detail.paymentDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== detail.paymentDate) fail('지급 예정일을 확인해주세요.');
    }
    return { amount, detail };
}
const selectAdditionalPayrolls = `SELECT d.draft_id, d.employee_id, d.document_type, d.title, d.content, d.detail_data,
    e.name AS employee_name, p.payment_id, p.amount AS paid_amount,
    DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paid_date
    FROM my_draft d LEFT JOIN employees e ON e.employee_id = d.employee_id
    LEFT JOIN payments p ON p.payment_direction = '출금' AND p.payment_status = '완료'
      AND JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.entry_type')) = 'additional_payroll'
      AND JSON_UNQUOTE(JSON_EXTRACT(p.payroll_snapshot, '$.additional_draft_id')) = CAST(d.draft_id AS CHAR)
    WHERE d.status IN ('APPROVED', '승인') AND d.document_type IN ('추가급여', '수당', '상여금')`;
function toAdditionalRow(row) {
    const detail = parse(row.detail_data);
    let error = '';
    try { validateAdditionalPayroll({ draft: { documentType: row.document_type, employeeId: row.employee_id, detailData: detail } }); }
    catch (e) { error = e.message; }
    return { ...row, detail_data: undefined, pay_month: detail.payMonth || '',
        payment_date: detail.paymentDate || `${detail.payMonth}-01`,
        payment_detail: detail.paymentDetail || '', amount: Number.isSafeInteger(Number(detail.amount)) && Number(detail.amount) > 0 ? Number(detail.amount) : 0,
        payment_status: row.payment_id ? '지급완료' : '지급대기', validation_error: error };
}
module.exports = { validateAdditionalPayroll, selectAdditionalPayrolls, toAdditionalRow, fail };
