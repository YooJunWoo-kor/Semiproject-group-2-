// backend/db.js
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