import axios from 'axios';
import { API_BASE_URL } from '../utils/authStorage';

// HR 부서 목록을 DB에서 조회합니다.
export function getHrDepartments() {
  return axios.get(API_BASE_URL + '/hr/departments');
}

// 신규 부서를 DB에 등록합니다.
export function createHrDepartment(data) {
  return axios.post(API_BASE_URL + '/hr/departments', data);
}

// 소속 직원이 없는 선택 부서를 삭제합니다.
export function deleteHrDepartment(departmentId) {
  return axios.delete(API_BASE_URL + '/hr/departments/' + departmentId);
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

// 연차 사용량 집계에 필요한 해당 연도의 휴가 신청 데이터를 조회합니다.
export function getHrLeavesByYear(year) {
  return axios.get(API_BASE_URL + '/hr/leaves', {
    params: { year }
  });
}

// 기존 전자결재 API로 휴가 기안의 승인·반려를 처리합니다.
export function decideHrLeave(draftId, employeeId, decision) {
  return axios.post(API_BASE_URL + '/drafts/' + draftId + '/decision', {
    employeeId,
    decision
  });
}

// 출퇴근 시간·근태 상태·수정 사유를 수정합니다.
export function updateHrAttendance(attendanceId, data) {
  return axios.put(API_BASE_URL + '/hr/attendance/' + attendanceId, data);
}

// 관리자가 선택한 직원의 신규 근태 기록을 등록합니다.
export function createHrAttendance(data) {
  return axios.post(API_BASE_URL + '/hr/attendance', data);
}

// 관리자가 선택한 근태 기록을 삭제합니다.
export function deleteHrAttendance(attendanceId) {
  return axios.delete(API_BASE_URL + '/hr/attendance/' + attendanceId);
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

// 선택한 직원의 월별 급여 이력을 조회합니다.
export function getHrPayrollHistory(employeeId) {
  return axios.get(
    API_BASE_URL + '/hr/payrolls/employee/' + employeeId + '/history'
  );
}

// 급여 미등록 직원의 급여를 등록합니다.
export function createHrPayroll(data) {
  return axios.post(API_BASE_URL + '/hr/payrolls', data);
}

// 기존 급여 기록을 수정합니다.
export function updateHrPayroll(payrollId, data) {
  return axios.put(API_BASE_URL + '/hr/payrolls/' + payrollId, data);
}

