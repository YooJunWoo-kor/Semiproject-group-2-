const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/getproject', async (req, res) =>{
    const query = `
        select project_id, project_name, start_date as 'start', end_date as 'end', employee_id, description
        from project
        where visible = 'true'
    `
    db.query(query, (err, data) => {
        if(err){
            console.log('스케줄 전체 공개 데이터 불러오기 DB오류');
            return res.status(500).json({status:'false', massage: data})
        }

        if(data && data.length > 0){
            console.log('전체 스케쥴 불러오기 성공', data);
            return res.status(200).json({status:'succeced', data: data})
        }
        else{
            console.log('전체공개 대이터 조회 실패', data);
            return res.status(400).json({status:'false', massage: data})
        }
    })
})

router.post('/setProject', async(req, res) => {
    const requst = req.body;
    const value = [
        requst.project_name, requst.start_date, requst.end_date, requst.description, requst.is_visible, requst.employee_id
    ]

    console.log(value);
})

module.exports = router;