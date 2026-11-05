// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 4000;

const homSurver = require('./routes/homServer')
const schedule = require('./routes/schedule')

app.use(cors());
app.use(express.json());
app.use('/api/AD', homSurver);
app.use('/api/schedule', schedule);

app.post('/api/login', (req, res) => {
    const query = `
        SELECT 
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            e.position,
            e.email,
            ea.role,
            ea.account_status
        FROM employees e
        INNER JOIN employee_accounts ea ON e.employee_id = ea.employee_id
        WHERE e.email = ? AND ea.password_hash = ?`;

    const value = [
        req.body.email,
        req.body.password
    ];
    
    db.query(query, value, (err, data) => {
        if (err) {
            console.error('DB 에러:', err);
            return res.status(500).json({ message: '데이터베이스 조회 오류' });
        }

        if (data && data.length > 0) {
            const user = data[0];

            // 휴직/비활성 계정 체크
            if (user.account_status !== 'ACTIVE') {
                return res.status(403).json(
                    { message: '현재 휴직 또는 비활성화된 계정입니다.' }
                );
            }

            // 로그인 성공
            return res.json({
                result: 'success',
                user: {
                    employee_id: user.employee_id,
                    employee_number: user.employee_number,
                    name: user.name,
                    department_id: user.department_id,
                    position: user.position,
                    role: user.role
                }
            });
        } else {
            return res.status(401).json(
                { message: '이메일 또는 비밀번호가 일치하지 않습니다.' }
            );
        }
    });
});

app.listen(PORT, '0.0.0.0',() => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});