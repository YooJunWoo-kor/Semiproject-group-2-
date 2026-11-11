const express = require('express');
const db = require('../db');

const hrRouter = express.Router();
const promiseDb = db.promise();

// HR API에서 공통으로 사용하는 날짜·이메일·급여월·금액 입력 검증 함수입니다.
function isDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(value + 'T00:00:00Z');

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function isTimeString(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isEmailString(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPayMonthString(value) {
    return typeof value === 'string' && /^(\d{4})-(0[1-9]|1[0-2])$/.test(value);
}

function parseNonNegativeInteger(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const numberValue = Number(value);

    return Number.isInteger(numberValue) && numberValue >= 0
        ? numberValue
        : null;
}

async function departmentExists(departmentId) {
    // 직원 등록·수정 전에 참조할 부서가 실제로 존재하는지 확인합니다.
    const [rows] = await promiseDb.query(
        'SELECT department_id FROM departments WHERE department_id = ?',
        [departmentId]
    );

    return rows.length > 0;
}


// 관리자가 선택한 직원의 신규 근태 기록을 등록합니다.
// 저장 요청이 있을 때만 한 건을 생성하며, 동일 직원·날짜 중복은 허용하지 않습니다.
hrRouter.post('/attendance', async (req, res) => {
    const employeeId = Number(req.body.employeeId);
    const workDate = String(req.body.workDate || '').trim();
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    const status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    const allowedStatuses = ['정상', '지각', '결근', '휴가', '출장', '휴직', '미출근'];

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !isDateString(workDate) ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !allowedStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '직원, 근무일, 출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    try {
        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1',
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '등록할 직원을 찾을 수 없습니다.'
            });
        }

        const [existingRows] = await promiseDb.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ? AND work_date = ?
             LIMIT 1`,
            [employeeId, workDate]
        );

        if (existingRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 날짜 근태 기록이 이미 존재합니다.'
            });
        }

        const [result] = await promiseDb.query(
            `INSERT INTO attendance
                (employee_id, work_date, check_in_at, check_out_at, attendance_status, memo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                workDate,
                checkIn ? `${workDate} ${checkIn}:00` : null,
                checkOut ? `${workDate} ${checkOut}:00` : null,
                status,
                memo
            ]
        );

        return res.status(201).json({
            success: true,
            data: {
                attendanceId: result.insertId,
                employeeId,
                attendanceDate: workDate,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 기록이 등록되었습니다.'
        });
    } catch (error) {
        console.error('신규 근태 등록 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 등록하지 못했습니다.'
        });
    }
});


// 달력용 근태 기록 조회
// 날짜·부서 조건은 선택적으로 적용하고 출근·퇴근 시각은 조회 전용으로 반환합니다.
hrRouter.get('/attendance', async (req, res) => {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const date = req.query.date || null;
    const departmentIdValue = req.query.departmentId;
    let departmentId = null;

    if (startDate && !isDateString(startDate)) {
        return res.status(400).json({
            success: false,
            message: '시작일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (endDate && !isDateString(endDate)) {
        return res.status(400).json({
            success: false,
            message: '종료일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (date && !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (departmentIdValue !== undefined) {
        departmentId = Number(departmentIdValue);

        if (!Number.isInteger(departmentId) || departmentId < 1) {
            return res.status(400).json({
                success: false,
                message: '올바른 부서 ID를 입력해 주세요.'
            });
        }
    }

    const query = `
        SELECT
            a.attendance_id AS attendanceId,
            a.employee_id AS employeeId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            a.attendance_status AS status,
            a.memo
        FROM attendance a
        INNER JOIN employees e
            ON e.employee_id = a.employee_id
        INNER JOIN departments d
            ON d.department_id = e.department_id
        WHERE (? IS NULL OR a.work_date >= ?)
          AND (? IS NULL OR a.work_date <= ?)
          AND (? IS NULL OR a.work_date = ?)
          AND (? IS NULL OR d.department_id = ?)
        ORDER BY a.work_date DESC, a.attendance_id DESC
    `;

    const values = [
        startDate, startDate,
        endDate, endDate,
        date, date,
        departmentId, departmentId
    ];

    try {
        const [rows] = await promiseDb.query(query, values);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('HR 근태정보 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 정보를 불러오지 못했습니다.'
        });
    }
});


// 기존 결재 초안과 휴가 기간을 조합한 휴가 신청 조회
// 휴가 신청·승인 저장 API가 없어 현재 라우트는 읽기 전용입니다.
hrRouter.get('/leaves', async (req, res) => {
    const month = String(req.query.month || '').trim();
    const year = String(req.query.year || '').trim();

    if (month && !isPayMonthString(month)) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회 월 형식은 YYYY-MM이어야 합니다.'
        });
    }

    if (year && !/^\d{4}$/.test(year)) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회 연도 형식은 YYYY여야 합니다.'
        });
    }

    if (month && year) {
        return res.status(400).json({
            success: false,
            message: '휴가 조회는 월 또는 연도 중 하나만 지정해 주세요.'
        });
    }

    const query = `
        SELECT
            dl.leave_id AS leaveId,
            md.draft_id AS draftId,
            md.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name AS employeeName,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            md.document_type AS leaveType,
            md.title,
            md.content AS reason,
            DATE_FORMAT(dl.start_date, '%Y-%m-%d') AS startDate,
            DATE_FORMAT(dl.end_date, '%Y-%m-%d') AS endDate,
            dl.leave_days AS leaveDays,
            CASE
                WHEN md.status IN ('승인', '승인완료', '완료') THEN '승인완료'
                WHEN md.status IN ('반려', '거절') THEN '반려'
                ELSE '승인대기'
            END AS applicationStatus,
            md.status AS sourceStatus,
            DATE_FORMAT(md.created_at, '%Y-%m-%d %H:%i') AS applicationDate,
            md.approver_id AS approverId,
            approver.name AS approverName,
            DATE_FORMAT(md.processed_at, '%Y-%m-%d %H:%i') AS approvalDate
        FROM draft_leave dl
        INNER JOIN my_draft md
            ON md.draft_id = dl.draft_id
        INNER JOIN employees e
            ON e.employee_id = md.employee_id
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN employees approver
            ON approver.employee_id = md.approver_id
        WHERE (? = '' OR DATE_FORMAT(dl.start_date, '%Y-%m') = ?)
          AND (? = '' OR DATE_FORMAT(dl.start_date, '%Y') = ?)
        ORDER BY dl.start_date DESC, dl.leave_id DESC
    `;

    try {
        const [rows] = await promiseDb.query(query, [
            month,
            month,
            year,
            year
        ]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('휴가 신청 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '휴가 신청 정보를 불러오지 못했습니다.'
        });
    }
});


// 근태 시간·상태·수정 사유를 수정합니다.
hrRouter.put('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);
    const checkIn = String(req.body.checkIn || '').trim() || null;
    const checkOut = String(req.body.checkOut || '').trim() || null;
    const status = String(req.body.status || '').trim();
    const memo = String(req.body.memo || '').trim();
    const allowedStatuses = ['정상', '지각', '결근', '휴가', '출장', '휴직', '미출근'];

    if (
        !Number.isInteger(attendanceId) ||
        attendanceId < 1 ||
        (checkIn !== null && !isTimeString(checkIn)) ||
        (checkOut !== null && !isTimeString(checkOut)) ||
        (checkIn !== null && checkOut !== null && checkOut < checkIn) ||
        !allowedStatuses.includes(status) ||
        memo.length === 0 ||
        memo.length > 255
    ) {
        return res.status(400).json({
            success: false,
            message: '출퇴근 시간, 근태 상태와 수정 사유를 올바르게 입력해 주세요.'
        });
    }

    try {
        const [existingRows] = await promiseDb.query(
            'SELECT attendance_id FROM attendance WHERE attendance_id = ? LIMIT 1',
            [attendanceId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '근태 기록을 찾을 수 없습니다.'
            });
        }

        await promiseDb.query(
            `UPDATE attendance
             SET check_in_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 check_out_at = CASE
                    WHEN ? IS NULL THEN NULL
                    ELSE CONCAT(DATE(work_date), ' ', ?, ':00')
                 END,
                 attendance_status = ?,
                 memo = ?
             WHERE attendance_id = ?`,
            [
                checkIn,
                checkIn,
                checkOut,
                checkOut,
                status,
                memo,
                attendanceId
            ]
        );

        return res.json({
            success: true,
            data: {
                attendanceId,
                clockIn: checkIn,
                clockOut: checkOut,
                status,
                memo
            },
            message: '근태 정보가 수정되었습니다.'
        });
    } catch (error) {
        console.error('근태 정보 수정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 정보를 수정하지 못했습니다.'
        });
    }
});


// 관리자가 선택한 근태 기록 한 건을 삭제합니다.
hrRouter.delete('/attendance/:attendanceId', async (req, res) => {
    const attendanceId = Number(req.params.attendanceId);

    if (!Number.isInteger(attendanceId) || attendanceId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 근태 기록 ID를 입력해 주세요.'
        });
    }

    try {
        const [result] = await promiseDb.query(
            'DELETE FROM attendance WHERE attendance_id = ?',
            [attendanceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '삭제할 근태 기록을 찾을 수 없습니다.'
            });
        }

        return res.json({
            success: true,
            data: { attendanceId },
            message: '근태 기록이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('근태 기록 삭제 오류:', error);

        return res.status(500).json({
            success: false,
            message: '근태 기록을 삭제하지 못했습니다.'
        });
    }
});


// 부서 직원 전체와 해당 날짜의 근태 조회
hrRouter.get('/attendance/department', async (req, res) => {
    const date = req.query.date;
    const departmentId = Number(req.query.departmentId);

    if (!date || !isDateString(date)) {
        return res.status(400).json({
            success: false,
            message: '조회일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    const query = `
        SELECT
            e.employee_id AS employeeId,
            a.attendance_id AS attendanceId,
            e.name AS employeeName,
            e.position,
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            DATE_FORMAT(a.work_date, '%Y-%m-%d') AS attendanceDate,
            DATE_FORMAT(a.check_in_at, '%H:%i') AS clockIn,
            DATE_FORMAT(a.check_out_at, '%H:%i') AS clockOut,
            COALESCE(a.attendance_status, '미출근') AS status,
            a.memo
        FROM employees e
        INNER JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN attendance a
            ON a.employee_id = e.employee_id
            AND a.work_date = ?
        WHERE e.department_id = ?
          AND e.employment_status = '재직'
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query, [date, departmentId]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 근태현황 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 근태현황을 불러오지 못했습니다.'
        });
    }
});


// 직원 목록 조회
// 직원 기본정보와 부서·계정 정보를 조합해 직원관리 화면에 전달합니다.
hrRouter.get('/employees', async (req, res) => {
    const query = `
        SELECT
            e.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            e.email,
            e.phone,
            DATE_FORMAT(e.hire_date, '%Y-%m-%d') AS hireDate,
            e.employment_status AS employmentStatus,
            ea.role,
            ea.account_status AS accountStatus
        FROM employees e
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN employee_accounts ea
            ON ea.employee_id = e.employee_id
        ORDER BY e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('직원 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '직원 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 목록 조회
// 부서장 이름과 설명을 함께 조회해 직원·부서 통합 화면에서 사용합니다.
hrRouter.get('/departments', async (req, res) => {
    const query = `
        SELECT
            d.department_id AS departmentId,
            d.department_name AS departmentName,
            d.manager_id AS managerId,
            m.name AS managerName,
            d.description
        FROM departments d
        LEFT JOIN employees m
            ON m.employee_id = d.manager_id
        ORDER BY d.department_id
    `;

    try {
        const [rows] = await promiseDb.query(query);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('부서 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '부서 목록을 불러오지 못했습니다.'
        });
    }
});


// 부서 등록
// 선택한 직원은 부서장으로 연결하고 부서명 중복을 먼저 확인합니다.
hrRouter.post('/departments', async (req, res) => {
    const departmentName = String(req.body.departmentName || '').trim();
    const description = String(req.body.description || '').trim();
    const managerIdValue = req.body.managerId;
    const managerId =
        managerIdValue === '' || managerIdValue === null || managerIdValue === undefined
            ? null
            : Number(managerIdValue);

    if (
        !departmentName ||
        departmentName.length > 50 ||
        description.length > 255 ||
        (managerId !== null && (!Number.isInteger(managerId) || managerId < 1))
    ) {
        return res.status(400).json({
            success: false,
            message: '부서 등록 정보를 올바르게 입력해 주세요.'
        });
    }

    try {
        const [duplicateRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_name = ?',
            [departmentName]
        );

        if (duplicateRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        if (managerId !== null) {
            const [managerRows] = await promiseDb.query(
                `SELECT employee_id
                 FROM employees
                 WHERE employee_id = ? AND employment_status <> '퇴사'`,
                [managerId]
            );

            if (managerRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '부서장으로 지정할 수 있는 직원을 찾을 수 없습니다.'
                });
            }
        }

        const [result] = await promiseDb.query(
            `INSERT INTO departments (
                department_name,
                manager_id,
                description
             )
             VALUES (?, ?, ?)`,
            [departmentName, managerId, description || null]
        );

        return res.status(201).json({
            success: true,
            data: {
                departmentId: result.insertId,
                departmentName,
                managerId,
                description: description || null
            },
            message: '부서가 등록되었습니다.'
        });
    } catch (error) {
        console.error('부서 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 부서명입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 등록하지 못했습니다.'
        });
    }
});


// 소속 직원이 없는 부서만 삭제합니다.
hrRouter.delete('/departments/:departmentId', async (req, res) => {
    const departmentId = Number(req.params.departmentId);
    let transactionStarted = false;

    if (!Number.isInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 부서 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [departmentRows] = await promiseDb.query(
            'SELECT department_id FROM departments WHERE department_id = ? FOR UPDATE',
            [departmentId]
        );

        if (departmentRows.length === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '삭제할 부서를 찾을 수 없습니다.'
            });
        }

        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE department_id = ? LIMIT 1',
            [departmentId]
        );

        if (employeeRows.length > 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: '소속 직원이 있는 부서는 삭제할 수 없습니다.'
            });
        }

        await promiseDb.query(
            'DELETE FROM departments WHERE department_id = ?',
            [departmentId]
        );
        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: '부서가 삭제되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('부서 삭제 오류:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: '연결된 자료가 있는 부서는 삭제할 수 없습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '부서를 삭제하지 못했습니다.'
        });
    }
});


// 급여월별 직원 급여 목록 조회
// LEFT JOIN으로 급여 미등록 직원도 포함해 실제 등록 여부를 표시합니다.
hrRouter.get('/payrolls', async (req, res) => {
    const payMonth = String(req.query.payMonth || '').trim();

    if (!isPayMonthString(payMonth)) {
        return res.status(400).json({
            success: false,
            message: '급여월 형식은 YYYY-MM이어야 합니다.'
        });
    }

    const query = `
        SELECT
            p.payroll_id AS payrollId,
            e.employee_id AS employeeId,
            e.employee_number AS employeeNumber,
            e.name AS employeeName,
            e.department_id AS departmentId,
            d.department_name AS departmentName,
            e.position,
            e.employment_status AS employmentStatus,
            p.pay_month AS payMonth,
            p.base_salary AS baseSalary,
            p.allowance,
            p.deduction,
            p.bonus,
            p.gross_pay AS grossPay,
            p.net_pay AS netPay,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paymentDate,
            CASE
                WHEN p.payroll_id IS NULL THEN '급여 미등록'
                ELSE COALESCE(p.payment_status, '지급대기')
            END AS paymentStatus
        FROM employees e
        LEFT JOIN departments d
            ON d.department_id = e.department_id
        LEFT JOIN payrolls p
            ON p.employee_id = e.employee_id
            AND p.pay_month = ?
        WHERE e.employment_status IN ('재직', '휴직')
        ORDER BY d.department_id, e.employee_id
    `;

    try {
        const [rows] = await promiseDb.query(query, [payMonth]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('급여 목록 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 정보를 불러오지 못했습니다.'
        });
    }
});


// 선택한 직원의 월별 급여 이력 조회
// 기존 payrolls 테이블의 실제 금액·지급 상태만 반환하고 최신 급여월 순으로 정렬합니다.
hrRouter.get('/payrolls/employee/:employeeId/history', async (req, res) => {
    const employeeId = Number(req.params.employeeId);

    if (!Number.isInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '직원 식별자가 올바르지 않습니다.'
        });
    }

    const query = `
        SELECT
            p.payroll_id AS payrollId,
            p.employee_id AS employeeId,
            p.pay_month AS payMonth,
            p.base_salary AS baseSalary,
            p.allowance,
            p.bonus,
            p.deduction,
            p.gross_pay AS grossPay,
            p.net_pay AS netPay,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paymentDate,
            COALESCE(p.payment_status, '지급대기') AS paymentStatus
        FROM payrolls p
        WHERE p.employee_id = ?
        ORDER BY p.pay_month DESC, p.payroll_id DESC
    `;

    try {
        const [rows] = await promiseDb.query(query, [employeeId]);

        return res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('직원 급여 이력 조회 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 이력을 불러오지 못했습니다.'
        });
    }
});


// 급여 등록
// 등록 요청의 금액을 검증하고 gross/net 금액은 서버에서 계산합니다.
hrRouter.post('/payrolls', async (req, res) => {
    const employeeId = Number(req.body.employeeId);
    const payMonth = String(req.body.payMonth || '').trim();
    const baseSalary = parseNonNegativeInteger(req.body.baseSalary);
    const allowance = parseNonNegativeInteger(req.body.allowance);
    const deduction = parseNonNegativeInteger(req.body.deduction);
    const bonus = parseNonNegativeInteger(req.body.bonus);
    const paymentDate = String(req.body.paymentDate || '').trim() || null;
    const paymentStatus = String(req.body.paymentStatus || '').trim() || '지급대기';

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !isPayMonthString(payMonth) ||
        baseSalary === null ||
        allowance === null ||
        deduction === null ||
        bonus === null ||
        paymentStatus.length > 20
    ) {
        return res.status(400).json({
            success: false,
            message: '급여 등록 정보를 올바르게 입력해 주세요.'
        });
    }

    if (paymentDate && !isDateString(paymentDate)) {
        return res.status(400).json({
            success: false,
            message: '지급일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    const grossPay = baseSalary + allowance + bonus;
    const netPay = grossPay - deduction;

    if (netPay < 0) {
        return res.status(400).json({
            success: false,
            message: '공제액은 세전 총액보다 클 수 없습니다.'
        });
    }

    try {
        const [employeeRows] = await promiseDb.query(
            'SELECT employee_id FROM employees WHERE employee_id = ?',
            [employeeId]
        );

        if (employeeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const [existingRows] = await promiseDb.query(
            `SELECT payroll_id
             FROM payrolls
             WHERE employee_id = ? AND pay_month = ?`,
            [employeeId, payMonth]
        );

        if (existingRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 월 급여가 이미 등록되어 있습니다.'
            });
        }

        const query = `
            INSERT INTO payrolls (
                employee_id,
                pay_month,
                base_salary,
                allowance,
                deduction,
                bonus,
                gross_pay,
                net_pay,
                payment_date,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await promiseDb.query(query, [
            employeeId,
            payMonth,
            baseSalary,
            allowance,
            deduction,
            bonus,
            grossPay,
            netPay,
            paymentDate,
            paymentStatus
        ]);

        return res.status(201).json({
            success: true,
            data: {
                payrollId: result.insertId,
                grossPay,
                netPay
            },
            message: '급여가 등록되었습니다.'
        });
    } catch (error) {
        console.error('급여 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '해당 직원의 선택한 월 급여가 이미 등록되어 있습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '급여를 등록하지 못했습니다.'
        });
    }
});


// 급여 수정
// 기존 급여 기록의 금액과 지급 상태를 다시 계산해 저장합니다.
hrRouter.put('/payrolls/:payrollId', async (req, res) => {
    const payrollId = Number(req.params.payrollId);
    const baseSalary = parseNonNegativeInteger(req.body.baseSalary);
    const allowance = parseNonNegativeInteger(req.body.allowance);
    const deduction = parseNonNegativeInteger(req.body.deduction);
    const bonus = parseNonNegativeInteger(req.body.bonus);
    const paymentDate = String(req.body.paymentDate || '').trim() || null;
    const paymentStatus = String(req.body.paymentStatus || '').trim() || '지급대기';

    if (
        !Number.isInteger(payrollId) ||
        payrollId < 1 ||
        baseSalary === null ||
        allowance === null ||
        deduction === null ||
        bonus === null ||
        paymentStatus.length > 20
    ) {
        return res.status(400).json({
            success: false,
            message: '급여 수정 정보를 올바르게 입력해 주세요.'
        });
    }

    if (paymentDate && !isDateString(paymentDate)) {
        return res.status(400).json({
            success: false,
            message: '지급일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    const grossPay = baseSalary + allowance + bonus;
    const netPay = grossPay - deduction;

    if (netPay < 0) {
        return res.status(400).json({
            success: false,
            message: '공제액은 세전 총액보다 클 수 없습니다.'
        });
    }

    try {
        const [existingRows] = await promiseDb.query(
            'SELECT payroll_id FROM payrolls WHERE payroll_id = ?',
            [payrollId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '급여 기록을 찾을 수 없습니다.'
            });
        }

        const query = `
            UPDATE payrolls
            SET base_salary = ?,
                allowance = ?,
                deduction = ?,
                bonus = ?,
                gross_pay = ?,
                net_pay = ?,
                payment_date = ?,
                payment_status = ?
            WHERE payroll_id = ?
        `;
        await promiseDb.query(query, [
            baseSalary,
            allowance,
            deduction,
            bonus,
            grossPay,
            netPay,
            paymentDate,
            paymentStatus,
            payrollId
        ]);

        return res.json({
            success: true,
            data: {
                payrollId,
                grossPay,
                netPay
            },
            message: '급여 정보가 수정되었습니다.'
        });
    } catch (error) {
        console.error('급여 수정 오류:', error);

        return res.status(500).json({
            success: false,
            message: '급여 정보를 수정하지 못했습니다.'
        });
    }
});


// 직원 등록
// 직원과 계정을 하나의 트랜잭션으로 등록해 부분 저장을 방지합니다.
hrRouter.post('/employees', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    let transactionStarted = false;

    if (
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: '이름, 부서, 직급, 이메일, 초기 비밀번호는 필수입니다.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    try {
        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeNumberRows] = await promiseDb.query(
            `SELECT employee_number AS employeeNumber
             FROM employees
             WHERE employee_number REGEXP '^EMP-[0-9]{4}$'
             ORDER BY CAST(SUBSTRING(employee_number, 5) AS UNSIGNED) DESC
             LIMIT 1
             FOR UPDATE`
        );
        const lastEmployeeNumber = employeeNumberRows[0]?.employeeNumber || 'EMP-0000';
        const nextEmployeeSequence = Number(lastEmployeeNumber.slice(4)) + 1;
        const employeeNumber = 'EMP-' + String(nextEmployeeSequence).padStart(4, '0');

        const employeeQuery = `
            INSERT INTO employees (
                employee_number,
                name,
                department_id,
                position,
                email,
                phone,
                hire_date,
                employment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, '재직')
        `;
        const [employeeResult] = await promiseDb.query(employeeQuery, [
            employeeNumber,
            name,
            departmentId,
            position,
            email,
            phone || null
        ]);

        const accountQuery = `
            INSERT INTO employee_accounts (
                employee_id,
                password_hash,
                role,
                account_status
            )
            VALUES (?, ?, 'USER', 'ACTIVE')
        `;
        await promiseDb.query(accountQuery, [employeeResult.insertId, password]);

        await promiseDb.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            data: {
                employeeId: employeeResult.insertId,
                employeeNumber
            },
            message: '직원 등록이 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 등록 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '자동 생성된 사번 또는 이메일이 이미 등록되어 있습니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원을 등록하지 못했습니다.'
        });
    }
});


// 직원 정보 수정
// 퇴사 처리는 별도 API로 제한하고 일반 직원 정보만 수정합니다.
hrRouter.put('/employees/:employeeId', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const name = String(req.body.name || '').trim();
    const departmentId = Number(req.body.departmentId);
    const position = String(req.body.position || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const hireDate = String(req.body.hireDate || '').trim();
    const employmentStatus = String(req.body.employmentStatus || '').trim();
    const allowedStatuses = ['재직', '휴직', '퇴사'];

    if (
        !Number.isInteger(employeeId) ||
        employeeId < 1 ||
        !name ||
        !Number.isInteger(departmentId) ||
        departmentId < 1 ||
        !position ||
        !email ||
        !hireDate ||
        !allowedStatuses.includes(employmentStatus)
    ) {
        return res.status(400).json({
            success: false,
            message: '직원 수정 정보를 올바르게 입력해 주세요.'
        });
    }

    if (!isEmailString(email)) {
        return res.status(400).json({
            success: false,
            message: '올바른 이메일 형식을 입력해 주세요.'
        });
    }

    if (!isDateString(hireDate)) {
        return res.status(400).json({
            success: false,
            message: '입사일 형식은 YYYY-MM-DD여야 합니다.'
        });
    }

    try {
        const [existingEmployees] = await promiseDb.query(
            `SELECT employment_status AS employmentStatus
             FROM employees
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (existingEmployees.length === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        if (
            employmentStatus === '퇴사' &&
            existingEmployees[0].employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리는 전용 퇴사 처리 기능을 이용해 주세요.'
            });
        }

        if (
            existingEmployees[0].employmentStatus === '퇴사' &&
            employmentStatus !== '퇴사'
        ) {
            return res.status(400).json({
                success: false,
                message: '퇴사 처리된 직원의 상태는 수정할 수 없습니다.'
            });
        }

        if (!(await departmentExists(departmentId))) {
            return res.status(400).json({
                success: false,
                message: '존재하지 않는 부서입니다.'
            });
        }

        const query = `
            UPDATE employees
            SET name = ?,
                department_id = ?,
                position = ?,
                email = ?,
                phone = ?,
                hire_date = ?,
                employment_status = ?
            WHERE employee_id = ?
        `;
        const [result] = await promiseDb.query(query, [
            name,
            departmentId,
            position,
            email,
            phone || null,
            hireDate,
            employmentStatus,
            employeeId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        return res.json({
            success: true,
            data: {
                employeeId
            },
            message: '직원 정보가 수정되었습니다.'
        });
    } catch (error) {
        console.error('직원 정보 수정 오류:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 이메일입니다.'
            });
        }

        return res.status(500).json({
            success: false,
            message: '직원 정보를 수정하지 못했습니다.'
        });
    }
});


// 직원 퇴사 처리
// 직원 상태와 계정 상태를 함께 변경하고 실패하면 트랜잭션을 롤백합니다.
hrRouter.patch('/employees/:employeeId/status', async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    let transactionStarted = false;

    if (!Number.isInteger(employeeId) || employeeId < 1) {
        return res.status(400).json({
            success: false,
            message: '올바른 직원 ID를 입력해 주세요.'
        });
    }

    try {
        await promiseDb.beginTransaction();
        transactionStarted = true;

        const [employeeResult] = await promiseDb.query(
            `UPDATE employees
             SET employment_status = '퇴사'
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (employeeResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원을 찾을 수 없습니다.'
            });
        }

        const [accountResult] = await promiseDb.query(
            `UPDATE employee_accounts
             SET account_status = 'SUSPENDED'
             WHERE employee_id = ?`,
            [employeeId]
        );

        if (accountResult.affectedRows === 0) {
            await promiseDb.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: '직원 계정을 찾을 수 없습니다.'
            });
        }

        await promiseDb.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            data: {
                employeeId,
                employmentStatus: '퇴사',
                accountStatus: 'SUSPENDED'
            },
            message: '퇴사 처리가 완료되었습니다.'
        });
    } catch (error) {
        if (transactionStarted) {
            await promiseDb.rollback();
        }

        console.error('직원 퇴사 처리 오류:', error);

        return res.status(500).json({
            success: false,
            message: '퇴사 처리에 실패했습니다.'
        });
    }
});


module.exports = hrRouter;
