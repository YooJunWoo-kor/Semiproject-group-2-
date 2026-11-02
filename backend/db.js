// backend/db.js
<<<<<<< HEAD
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
=======
const mysql = require('mysql2');
require('dotenv').config();

// .env파일에서 설정한 정보 연결.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err)=>{
    if(err){
        console.log('db falied');
    } else{
        console.log('db connected');
    }
})
    
module.exports = db;
>>>>>>> 43f3d813f8a79237e473bdf37128f02d4eaf3ea1
