// backend/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1111', // 👈 이 부분을 본인의 DBeaver 비밀번호로 바꿔주세요!
    database: 'mydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then((conn) => {
        console.log('✅ MySQL mydb 연결 성공');
        conn.release();
    })
    .catch((err) => {
        console.error('❌ MySQL 연결 실패:', err.message);
    });

module.exports = pool;