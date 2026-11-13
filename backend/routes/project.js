const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/getproject', async (req, res) =>{
    const query = `
        select project_id, project_name, start_date as 'start', end_date as 'end', employee_id, description, visible, typeId
        from project
        where visible = 1
        order by start_date
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

router.post('/setProject', async (req, res) => {
    const requst = req.body;
    const value = [
        requst.project_name,
        requst.start_date,
        requst.end_date,
        requst.description,
        requst.is_visible,
        requst.employee_id,
        requst.typeId
    ];

    const query = `
        INSERT INTO project (project_name, start_date, end_date, description, visible, employee_id, typeId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, value, (err, data) => {
        if (err) {
            console.log('프로젝트 등록 DB에러', err);
            return res.status(500).json({ status: 'false', data: err, message: '프로젝트 등록 DB에러' });
        }

        if (data && data.affectedRows > 0) {
            const projectId = data.insertId;
            const memberList = requst.members || [];
            const memberID = [];

            // 1. 프로젝트 리더 추가
            if (requst.employee_id) {
                memberID.push([projectId, requst.employee_id]);
            }

            // 2. 참석자 목록 추가 (리더와 사번이 중복되지 않도록 필터링)
            memberList.forEach((item) => {
                if (item.employee_id && Number(item.employee_id) !== Number(requst.employee_id)) {
                    memberID.push([projectId, item.employee_id]);
                }
            });

            // 3. 다중 INSERT 쿼리 (VALUES ? 필수)
            const setMemberProjectQR = `
                INSERT INTO project_members (project_id, employee_id)
                VALUES ?
            `;

            db.query(setMemberProjectQR, [memberID], (memberErr, memberData) => {
                if (memberErr) {
                    console.log('프로젝트 멤버 리스트 DB에러', memberErr);
                    return res.status(500).json({
                        status: 'false',
                        data: memberErr,
                        message: '프로젝트 멤버 등록 DB에러'
                    });
                }

                console.log('멤버 등록 성공');
                // 멤버 등록까지 모두 완료된 후 최종 응답 반환
                return res.status(200).json({
                    status: 'succesed',
                    data: data,
                    memberData: memberData
                });
            });
        } else {
            console.log('등록실패', data);
            return res.status(400).json({ status: 'false', data: null, message: '등록실패' });
        }
    });
});

router.post('/get_employee', async(req, res)=>{
    const employee_id = req.body.employee_id;
    const query = `
        select * from employees where employee_id = ?
    `
    db.query(query, employee_id, (err,data)=>{
        if(err){
            console.log('해당 사원 정보 불러오기DB에러');
            return res.status(500).json({status:false, massage: err});
        }
        
        if(data, data.length > 0){
            console.log(data);
            return res.status(200).json({status:true, data: data});
        }
        else{
            console.log('해당 사원 정보 불러오기 실패', err);
            return res.status(400).json({status:false, massage: data});
        }
    })
});

router.post('/get_project_member', async(req, res)=>{
    const projectID = req.body.projectID;
    const query = `
        SELECT 
            pm.project_id,
            e.*
        FROM project_members pm
        JOIN employees e 
            ON pm.employee_id = e.employee_id
        WHERE pm.project_id = ?
    `;

    db.query(query, [projectID], (err, data) => {
        if (err) {
            console.log('프로젝트 멤버 조회 DB에러', err);
            return res.status(500).json({ status: false, message: err });
        }

        console.log('조회 성공', data);
        return res.status(200).json({
            status: true,
            data: data
        });
    });
});

module.exports = router;