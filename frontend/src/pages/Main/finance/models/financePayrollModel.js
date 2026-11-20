// 담당 화면: 해당 업무의 화면·컨트롤러
// 역할: 급여·공제 화면의 금액 계산·입력 검증·요청값 구성을 담당합니다.
// 급여 Model: 지급/공제 납부의 폼·대상·금액·검증·요청 데이터 계산.
export const payrollMoneyKeys = [
  "base_salary",
  "allowance",
  "bonus",
  "other_payment",
  "deduction",
  "gross_pay",
  "net_pay",
];
export function payrollWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}
export function createPayrollPaymentForm(paymentDate = "") {
  return {
    account_id: "",
    payment_date: paymentDate,
    password: "",
  };
}
export { canAccessFinance as canPayPayroll } from "../utils/financeDataUtils";
export function getPayrollPaymentSummary(rows) {
  const unpaidRows = rows.filter((row) => row.payment_status !== "지급완료");
  const pendingAmount = unpaidRows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0);
  return {
    unpaidRows,
    pendingAmount,
  };
}
export function getPayrollDeductionSummary(data) {
  const pending = (data?.items || []).filter(
    (row) => row.status === "납부대기" && Number(row.amount) > 0,
  );
  return {
    pending,
    amount: Number(data?.pending_total),
  };
}

function getPayrollEmployeeId(user) {
  return Number(user?.employee_id ?? user?.employeeKey);
}

function validatePayrollEmployee(user) {
  const id = getPayrollEmployeeId(user);
  if (!Number.isSafeInteger(id) || id <= 0)
    return "로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.";

  return "";
}

function hasPayrollPaymentFields(form) {
  return Boolean(form.account_id && form.payment_date && form.password);
}

export function validatePayrollPayment(form, user, amount) {
  const employeeError = validatePayrollEmployee(user);
  if (employeeError) return employeeError;
  if (!hasPayrollPaymentFields(form) || amount <= 0)
    return "회사계좌, 지급일, 로그인 비밀번호와 실지급액을 확인해 주세요.";

  return "";
}
export function validatePayrollDeduction(form, user, pending, amount) {
  const employeeError = validatePayrollEmployee(user);
  if (employeeError) return employeeError;
  if (
    !hasPayrollPaymentFields(form) ||
    !pending.length ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  )
    return "회사계좌, 납부일, 비밀번호와 공제액을 확인해 주세요.";

  return "";
}
export function getPayrollPaymentPayload(form, user, unpaidRows, amount) {
  return {
    account_id: Number(form.account_id),
    payment_date: form.payment_date,
    expected_amount: amount,
    expected_payroll_ids: unpaidRows.map((row) => Number(row.payroll_id)),
    employee_id: getPayrollEmployeeId(user),
    password: form.password,
  };
}
export function getPayrollDeductionPayload(form, user, pending, amount) {
  return {
    account_id: Number(form.account_id),
    payment_date: form.payment_date,
    employee_id: getPayrollEmployeeId(user),
    password: form.password,
    expected_amount: amount,
    expected_salary_payment_ids: pending.map((row) => Number(row.salary_payment_id)),
  };
}
