// backend/db.js
const mysql = require('mysql2');
require('dotenv').config();

// .env파일에서 설정한 정보 연결.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err)=>{
    if(err){
        console.error('db failed:', err.code || err.message);
    } else{
        console.log('db connected');
    }
})
    
module.exports = db;
