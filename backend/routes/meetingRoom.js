const express = require("express");
const router = express.Router();
const db = require("../db");

// 회의실 예약 등록
router.post("/reservations", async (req, res) => {
    const {
        roomId,
        reservationDate,
        startTime,
        endTime,
        title,
        content,
        reserverName,
        phone,
        email
    } = req.body;

    // 필수 입력값 검사
    if (
        !roomId ||
        !reservationDate ||
        !startTime ||
        !endTime ||
        !title?.trim() ||
        !reserverName?.trim()
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
        // 실제 존재하고 사용 가능한 회의실인지 확인
        const [rooms] = await db.promise().query(
            `SELECT room_id
             FROM meeting_rooms
             WHERE room_id = ? AND available = TRUE`,
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).json({
                message: "사용 가능한 회의실이 없습니다."
            });
        }

        // 기존 예약과 시간 중복 검사
        const checkSql = `
            SELECT reservation_id
            FROM meeting_room_reservations
            WHERE room_id = ?
              AND reservation_date = ?
              AND start_time < ?
              AND end_time > ?
            LIMIT 1
        `;

        const [existing] = await db.promise().query(
            checkSql,
            [roomId, reservationDate, endTime, startTime]
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
                room_id,
                reservation_date,
                start_time,
                end_time,
                title,
                content,
                reserver_name,
                phone,
                email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            roomId,
            reservationDate,
            startTime,
            endTime,
            title,
            content || null,
            reserverName,
            phone || null,
            email || null
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

module.exports = router;