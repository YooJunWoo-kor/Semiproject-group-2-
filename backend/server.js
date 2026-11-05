// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 4000;

const Attendance = require('./models/Attendance'); //출결관련 함수 클레스
const financeRouter = require("./routers/financeRouters"); // 재무 API 연결

app.use(cors());
app.use(express.json());

// 재무 API는 routers/financeRouters.js에서 처리합니다.
app.use("/api/finance", financeRouter);

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
        const [rows] = await db.query('SELECT id, employee_id, name, email, department, position, phone, created_at FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error('사원 목록 조회 에러:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { empNumber } = req.params;
        const records = await Attendance.getData(empNumber);

        res.json({
            result: 'success',
            data: records
        });
    }
    catch (err) {
        return res.json({ result: 'fail' })
    }
}
)

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

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});