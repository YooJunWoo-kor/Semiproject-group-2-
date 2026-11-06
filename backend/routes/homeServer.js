const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('../db');
const communityRouter = require('./community');

console.log('communityRouter 타입:', typeof communityRouter);

const app = express();
const PORT = process.env.PORT || 4000;


// 기본 설정
app.use(cors());
app.use(express.json());


// 회원가입
app.post('/api/register', async (req, res) => {
    const {
        employeeId,
        name,
        email,
        password,
        department,
        position,
        phone
    } = req.body;

    if (!employeeId || !name || !email || !password) {
        return res.status(400).json({
            error: '사원번호, 이름, 이메일, 비밀번호는 필수입니다.'
        });
    }

    try {
        const query = `
            INSERT INTO users
            (employee_id, name, email, password, department, position, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.promise().query(query, [
            employeeId,
            name,
            email,
            password,
            department,
            position,
            phone
        ]);

        res.status(201).json({
            message: '사원 등록 성공',
            insertedId: result.insertId
        });

    } catch (error) {
        console.error('회원가입 오류:', error);

        if (error.errno === 1062) {
            return res.status(409).json({
                error: '이미 사용 중인 사원번호 또는 이메일입니다.'
            });
        }

        res.status(500).json({
            error: error.message
        });
    }
});


// 사원 목록 조회
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT id, employee_id, name, email,
            department, position, phone, created_at
            FROM users
            ORDER BY id DESC`
        );

        res.json(rows);

    } catch (error) {
        console.error('사원 목록 조회 오류:', error);

        res.status(500).json({
            error: error.message
        });
    }
});


// 로그인
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

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
        INNER JOIN employee_accounts ea
            ON e.employee_id = ea.employee_id
        WHERE e.email = ?
        AND ea.password_hash = ?
    `;

    try {
        const [rows] = await db.promise().query(query, [
            email,
            password
        ]);

        if (rows.length === 0) {
            return res.status(401).json({
                message: '이메일 또는 비밀번호가 일치하지 않습니다.'
            });
        }

        const user = rows[0];

        if (user.account_status !== 'ACTIVE') {
            return res.status(403).json({
                message: '현재 휴직 또는 비활성화된 계정입니다.'
            });
        }

        res.json({
            result: 'success',
            user: {
                employee_id: user.employee_id,
                employee_number: user.employee_number,
                name: user.name,
                department_id: user.department_id,
                position: user.position,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('로그인 오류:', error);

        res.status(500).json({
            message: '데이터베이스 조회 오류'
        });
    }
});


// 자유게시판 라우터 연결
app.use('/api/community', communityRouter);


// 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 Home Server 실행: http://localhost:${PORT}`);
});