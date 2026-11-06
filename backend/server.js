
// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const app = express();

// 기존 프론트엔드 API 주소와 맞춘 포트
const PORT = process.env.PORT || 4000;

// main에서 추가된 근태 및 일정 라우터
const homSurver = require('./routes/homServer');
const schedule = require('./routes/schedule');

app.use(cors());
app.use(express.json());

// 2. [사원 등록 API] RegisterPage 폼 전송 수신
app.post('/api/register', async (req, res) => {
    const { employeeId, name, email, password, department, position, phone } = req.body;

    if (!employeeId || !name || !email || !password) {
        return res.status(400).json({ error: '사원번호, 이름, 이메일, 비밀번호는 필수입니다.' });
    }

    try {
        const query = `
            INSERT INTO users (employee_id, name, email, password, department, position, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [
            employeeId,
            name,
            email,
            password,
            department,
            position,
            phone
        ]);

        console.log(`✅ 사원 등록 완료: [${employeeId}] ${name}`);
        res.status(201).json({ message: '사원 등록 성공', insertedId: result.insertId });
    } catch (error) {
        console.error('회원가입 에러:', error);
        if (error.errno === 1062) {
            return res.status(409).json({ error: '이미 사용 중인 사원번호 또는 이메일입니다.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// 3. [사원 목록 조회 API]
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, employee_id, name, email, department, position, phone, created_at FROM users ORDER BY id DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('사원 목록 조회 에러:', error);
        res.status(500).json({ error: error.message });
    }
});

// 기존 로그인 API
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

// main에서 추가된 근태 관리 API
app.use('/api/AD', homSurver);

// main에서 추가된 일정 관리 API
app.use('/api/schedule', schedule);

// 서버 실행
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
