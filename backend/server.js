
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const app = express();

const PORT = process.env.PORT || 4000;

const path = require("path");

// 라우터
const homSurver = require('./routes/homServer');
const schedule = require('./routes/schedule');
const DraftServer = require('./routes/drafts');
const communityRouter = require('./routes/community');
const financeRouter = require('./routes/financeRouters'); // main 재무 라우터
const hrRouter = require('./routes/hrRoutes'); // main 인사 라우터
const Attendance = require('./models/Attendance');
const project = require('./routes/project');

// 품질관리 라우터 추가
const qualityRoutes = require('./routes/quality');

// 미들웨어
app.use(cors());
app.use(express.json());

// API 연결
app.use('/api/hr', hrRouter);
app.use('/api/finance', financeRouter);
app.use('/api/drafts', DraftServer);
app.use('/api/AD', homSurver);
app.use('/api/schedule', schedule);
app.use('/api/community', communityRouter);
app.use('/api/quality', qualityRoutes);
app.use('/api/project', project)

app.use("/Images", express.static(path.join(__dirname, "uploads/Images")))

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
        const [result] = await db.promise().query(query, [
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
app.get('/api/users', (req, res) => {

    const query = `
        SELECT
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            d.department_name,
            e.position,
            e.email,
            ea.role,
            ea.account_status
        FROM employees e
        LEFT JOIN departments d
            ON e.department_id = d.department_id
        INNER JOIN employee_accounts ea
            ON e.employee_id = ea.employee_id
        WHERE ea.account_status = 'ACTIVE'
        ORDER BY e.employee_id
    `;

    db.query(query, (err, data) => {

        if (err) {
            console.error('직원 목록 조회 에러:', err);

            return res.status(500).json({
                message: '직원 목록 조회 실패'
            });
        }

        res.json(data);
    });
});

app.post('/api/attendance', async (req, res) =>{
        try{
            const empNumber = req.body?.empNumber ?? req.body?.userID;
            const records = await Attendance.getData(empNumber);

            res.json({
                result: 'success',
                data: records
            });
        }
        catch(err){
            return res.json({result:'fail'}) 
        }
    }
)




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

    console.log("로그인 요청 도착", req.body.email);
    console.log('작동중');
    const query = `
        SELECT
            e.employee_id,
            e.employee_number,
            e.name,
            e.department_id,
            d.department_name,
            e.position,
            e.email,
            ea.role,
            ea.account_status
        FROM employees e
        JOIN departments d ON d.department_id = e.department_id
        INNER JOIN employee_accounts ea ON e.employee_id = ea.employee_id 
        WHERE e.email = ? AND ea.password_hash = ?`;
        // employee_accounts와 join하는 이유는 권한,상태 등이    employee_accounts에 있기 때문이다.

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
                    department_name: user.department_name,
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

// 서버 실행
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
