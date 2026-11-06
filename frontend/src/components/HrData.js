import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

// HR 부서 목록을 DB에서 조회합니다.
export function getHrDepartments() {
  return axios.get(API_BASE_URL + '/hr/departments');
}

// 신규 부서를 DB에 등록합니다.
export function createHrDepartment(data) {
  return axios.post(API_BASE_URL + '/hr/departments', data);
}

// HR 직원 목록을 DB에서 조회합니다.
export function getHrEmployees() {
  return axios.get(API_BASE_URL + '/hr/employees');
}

// 대시보드와 근태관리에서 사용하는 전체 근태 기록을 조회합니다.
export function getHrAttendance(params) {
  return axios.get(API_BASE_URL + '/hr/attendance', { params });
}

// 기존 결재 초안과 휴가 기간 데이터를 조합한 휴가 신청 목록을 조회합니다.
export function getHrLeaves(month) {
  return axios.get(API_BASE_URL + '/hr/leaves', {
    params: { month }
  });
}

// 출근·퇴근은 유지하고 근태 상태와 메모만 수정합니다.
export function updateHrAttendance(attendanceId, data) {
  return axios.put(API_BASE_URL + '/hr/attendance/' + attendanceId, data);
}

// 선택한 날짜와 부서의 직원별 출결 현황을 조회합니다.
export function getHrDepartmentAttendance(date, departmentId) {
  return axios.get(API_BASE_URL + '/hr/attendance/department', {
    params: {
      date,
      departmentId
    }
  });
}

// 직원관리·부서관리·대시보드에서 함께 사용하는 부서와 직원 데이터입니다.
export function getHrOrganization() {
  return Promise.all([getHrDepartments(), getHrEmployees()]);
}

// 이미 조회한 직원 배열을 departmentId 기준으로 필터링합니다.
export function filterHrEmployeesByDepartment(employees, departmentId) {
  return employees.filter(
    (employee) => String(employee.departmentId) === String(departmentId)
  );
}

// 직원 등록 API를 호출합니다.
export function createHrEmployee(data) {
  return axios.post(API_BASE_URL + '/hr/employees', data);
}

// 직원 정보 수정 API를 호출합니다.
export function updateHrEmployee(employeeId, data) {
  return axios.put(API_BASE_URL + '/hr/employees/' + employeeId, data);
}

// 직원을 삭제하지 않고 퇴사 상태로 변경하는 API를 호출합니다.
export function retireHrEmployee(employeeId) {
  return axios.patch(API_BASE_URL + '/hr/employees/' + employeeId + '/status');
}

// 선택한 급여월의 직원별 급여 정보를 조회합니다.
export function getHrPayrolls(payMonth) {
  return axios.get(API_BASE_URL + '/hr/payrolls', {
    params: {
      payMonth
    }
  });
}

// 급여 미등록 직원의 급여를 등록합니다.
export function createHrPayroll(data) {
  return axios.post(API_BASE_URL + '/hr/payrolls', data);
}

// 기존 급여 기록을 수정합니다.
export function updateHrPayroll(payrollId, data) {
  return axios.put(API_BASE_URL + '/hr/payrolls/' + payrollId, data);
}

