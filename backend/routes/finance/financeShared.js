const queries = require("../../queries/finance/sharedQueries");
// 기존 payments의 급여 지급 당시 금액을 읽습니다. 별도 연결 테이블은 사용하지 않습니다.
const payrollPaymentRowsSql = queries.selectPayments;



// 승인 기안서를 조회용 재무 목록 형식으로 변환합니다. DB에 복제하지 않습니다.
function readDetailData(value) {
    if (Buffer.isBuffer(value)) value = value.toString('utf8');
    if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { return {}; }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readAmount(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^[1-9]\d*(?:\.0+)?$/.test(value.trim())) return null;
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function readDueDate(value) {
    if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function financeApprovalStatus(value) {
    const status = String(value || '').trim().toUpperCase();
    if (['APPROVED', '승인'].includes(status)) return '승인';
    if (['PENDING', 'WAITING', 'IN_PROGRESS', '대기', '승인대기', '결재대기', '진행중'].includes(status)) return '대기';
    if (['REJECTED', '반려'].includes(status)) return '반려';
    return null;
}

function toApprovedDraftView(rows, includeUnapproved = false) {
    const seen = new Set();
    return rows.filter((row) => {
        const id = String(row.draft_id ?? '');
        if (!financeApprovalStatus(row.status) || (!includeUnapproved && financeApprovalStatus(row.status) !== '승인') || !/^[1-9]\d*$/.test(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
    }).map((row) => {
        const detail = readDetailData(row.detail_data);
        return {
            document_id: `draft-${row.draft_id}`,
            source_type: 'draft', source_draft_id: row.draft_id,
            is_payroll_draft: Number(row.is_payroll_draft) === 1,
            payroll_months: String(row.payroll_months || '').split(',').filter(Boolean),
            linked_transaction_id: row.linked_transaction_id ?? null,
            employee_id: row.employee_id,
            requester_name: row.requester_name,
            department_name: row.department_name,
            title: row.title, content: row.content || '',
            amount: readAmount(row.expense_amount ?? row.payroll_amount ?? detail.amount),
            due_date: readDueDate(detail.due_date),
            approval_status: financeApprovalStatus(row.status), original_approval_status: row.status, document_type: row.document_type,
            created_at: row.created_at,
            payment_methods: '', attachment_count: row.receipt_image_url ? 1 : 0
        };
    });
}


// 연결 거래에서 완료한 지급도 원본 결재의 남은 지급액에 반영합니다.
const approvalPaidRowsSql = queries.selectPayments2;

// 결제 관리의 분류와 기간 계산. 금액은 실제 payments 완료 내역을 기준으로 집계합니다.
const expenseGroups = [
    ['production', '제품 생산 및 매입 비용', ['원재료비', '부자재비', '완제품 매입비', '외주가공비', '물류 및 보관비']],
    ['research', '연구개발 및 인증 비용', ['제품 연구개발비', '샘플 제작비', '시험·검사비', '인증·등록비']],
    ['marketing', '마케팅 및 유통 판매비', ['광고비', '콘텐츠 제작비', '인플루언서 협찬비', '판매 수수료', '배송비', '프로모션비']],
    ['administration', '일반 관리 및 인건비', ['급여', '복리후생비', '임차료', '공과금', '사무용품비', '시스템 이용료']]
];
// 수입 분류는 기본안이며 회사 기준에 맞게 이 목록에서 변경할 수 있습니다.
const incomeGroups = [
    ['sales', '제품 매출', ['도매 매출', '소매 매출', '온라인 매출']],
    ['other_income', '기타 수입', ['환급금', '기타 수입']]
];
function groups(direction) {
    const prefix = direction === '출금' ? 'expense' : 'income';
    const source = direction === '출금' ? expenseGroups : incomeGroups;
    return [...source.map(([id, label, names]) => ({
        id, label,
        items: names.map((name, index) => ({ code: `${prefix}_${id}_${index + 1}`, label: name }))
    })), { id: 'unclassified', label: '미분류', items: [{ code: 'unclassified', label: '미분류' }] }];
}
function category(code, direction) {
    for (const group of groups(direction)) {
        const item = group.items.find(entry => entry.code === code);
        if (item) return { ...item, group_id: group.id, group_label: group.label };
    }
    return null;
}
function seoulToday() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function dateString(year, monthIndex, day) {
    return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}
function period(month, today = seoulToday()) {
    if (typeof month !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) || month > '9998-12') {
        const error = new Error('올바른 조회 월을 선택해 주세요.'); error.status = 400; throw error;
    }
    const [year, number] = month.split('-').map(Number);
    const index = number - 1;
    const currentMonth = today.slice(0, 7) === month;
    const lastDay = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const previousLastDay = new Date(Date.UTC(year, index, 0)).getUTCDate();
    const day = currentMonth ? Number(today.slice(8, 10)) : lastDay;
    // 완료 월은 전월 전체, 진행 중인 월은 전월 동일 일수(말일 이내)와 비교합니다.
    const previousDay = currentMonth ? Math.min(day, previousLastDay) : previousLastDay;
    return {
        start: `${month}-01`, end: dateString(year, index, day),
        endExclusive: dateString(year, index, day + 1), monthEndExclusive: dateString(year, index + 1, 1),
        previousStart: dateString(year, index - 1, 1), previousEnd: dateString(year, index - 1, previousDay),
        previousEndExclusive: dateString(year, index - 1, previousDay + 1), currentMonth
    };
}
function amount(value) {
    const number = Number(value);
    if (value == null || !Number.isFinite(number) || number < 0 || Math.abs(number * 100 - Math.round(number * 100)) > 0.001 || !Number.isSafeInteger(Math.round(number * 100))) {
        throw new Error('집계 금액이 처리 가능한 범위를 초과했습니다.');
    }
    return number;
}
function sum(rows) {
    let minor = 0;
    for (const row of rows) {
        minor += Math.round(amount(row.amount) * 100);
        if (!Number.isSafeInteger(minor)) throw new Error('합계 금액이 처리 가능한 범위를 초과했습니다.');
    }
    return minor / 100;
}
function summary(entries, previousEntries, scheduled) {
    const total = sum(entries), previous = sum(previousEntries);
    return {
        total, scheduled: sum(scheduled), previous_total: previous,
        difference: Math.round((total - previous) * 100) / 100,
        change_percent: previous === 0 ? null : Math.round((total - previous) / previous * 1000) / 10
    };
}



module.exports = { payrollPaymentRowsSql, readDetailData, readAmount, readDueDate, financeApprovalStatus, toApprovedDraftView, approvalPaidRowsSql, expenseGroups, incomeGroups, groups, category, seoulToday, dateString, period, amount, sum, summary };
