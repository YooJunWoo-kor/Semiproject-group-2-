
// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const app = express();

// 기존 프론트엔드 API 주소와 맞춘 포트
const PORT = process.env.PORT || 4000;

const homSurver = require('./routes/homServer')
const schedule = require('./routes/schedule')
const DraftServer = require('./routes/drafts')
const communityRouter = require('./routes/community');
const financeRouter = require('./routes/financeRouters'); // 재무 API
const hrRouter = require('./routes/hrRoutes'); // 인사 API

const Attendance = require('./models/Attendance'); // 출결 관련 함수 클래스

app.use(cors());
app.use(express.json());
app.use('/api/hr', hrRouter);
app.use('/api/finance', financeRouter);
app.use('/api/AD', homSurver);
app.use('/api/schedule', schedule);
app.use('/api/drafts', DraftServer);
app.use('/api/community', communityRouter);

// 기존 로그인 API
app.post('/api/login', (req, res) => {

    console.log("로그인 요청 도착", req.body.email);
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
            console.log('로그인성공');
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
            console.log('비밀번호, 아이디 오류');
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
