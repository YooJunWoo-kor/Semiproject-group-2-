const express = require("express");
const router = express.Router();
const db = require("../db");

// 회의실 예약 등록
router.post("/reservations", async (req, res) => {
    const {
        roomNumber,
        reservationDate,
        startTime,
        endTime,
        employeeId,
        title,
        content
    } = req.body;

    // 필수 입력값 검사
    if (
        !roomNumber ||
        !reservationDate ||
        !startTime ||
        !endTime ||
        !title?.trim() ||
        !employeeId
    ) {
        return res.status(400).json({
            message: "필수 정보를 입력해주세요."
        });
    }

    // 시간 유효성 검사
    if (startTime >= endTime) {
        return res.status(400).json({
            message: "종료 시간은 시작 시간보다 늦어야 합니다."
        });
    }

    try {

        // 기존 예약과 시간 중복 검사
        const checkSql = `
            SELECT room_id
            FROM meeting_room_reservations
            WHERE room_number = ?
              AND reservation_date = ?
              AND start_time < ?
              AND end_time > ?
            LIMIT 1
        `;

        const [existing] = await db.promise().query(
            checkSql,
            [roomNumber, reservationDate, endTime, startTime]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "이미 예약된 시간입니다."
            });
        }

        // 예약 정보 INSERT
        const insertSql = `
            INSERT INTO meeting_room_reservations
            (
                room_number,
                reservation_date,
                start_time,
                end_time,
                employee_id,
                title,
                content
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            roomNumber,
            reservationDate,
            startTime,
            endTime,
            employeeId,
            title,
            content || null,
        ];

        const [result] = await db.promise().query(
            insertSql,
            values
        );

        return res.status(201).json({
            message: "회의실 예약이 완료되었습니다.",
            reservationId: result.insertId
        });

    } catch (error) {
        console.error("회의실 예약 오류:", error);

        return res.status(500).json({
            message: "회의실 예약 처리 중 오류가 발생했습니다."
        });
    }
});

// 날짜별 회의실 예약 현황 조회
router.get("/reservations", async (req, res) => {

    const { date } = req.query;

    try {
        const sql = `
            SELECT
                r.room_id,
                r.room_number,
                r.employee_id,
                r.title,
                r.content,
                e.name AS reserver_name,
                e.email,
                TIME_FORMAT(r.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(r.end_time, '%H:%i') AS end_time
            FROM meeting_room_reservations r
            JOIN employees e
            ON r.employee_id = e.employee_id
            WHERE r.reservation_date = ?
            ORDER BY r.room_number, r.start_time
        `;

        const [rows] = await db.promise().query(sql, [date]);

        return res.status(200).json(rows);

    } catch (error) {
        console.error("예약 조회 오류:", error);

        return res.status(500).json({
            message: "예약 현황 조회에 실패했습니다."
        });
    }
});

router.delete("/reservations/:id", async (req, res) => {
    const room_id = Number(req.params.id);

    try{
        const sql = `
            DELETE from meeting_room_reservations
            WHERE room_id = ?
        `

        const value = room_id;

        const [rows] = await db.promise().query(sql,[value]);

        return res.status(200).json(rows);
    } catch (error) {
        console.error("예약 삭제 오류");

        return res.status(500).json({
            message: "예약 삭제에 실패했습니다."
        })
    }
})

module.exports = router;