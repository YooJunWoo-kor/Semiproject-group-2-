const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/getproject', async (req, res) =>{
    const query = `
        select project_id, project_name as schedule_name, start_date as 'start', end_date as 'end', employee_id, description, visible, typeId
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

// POST /api/project/new-worklist
router.post('/new-worklist', async (req, res) => {
    const {
        title,
        type_id,
        start_day,
        end_day,
        start_time,
        end_time,
        content,
        employee_id
    } = req.body;

    if (!title || !start_day || !end_day || !employee_id) {
        return res.status(400).json({
            message: '필수 입력 항목(제목, 시작일, 마감일, 작성자 ID)이 누락되었습니다.'
        });
    }

    try {
        const sql = `
            INSERT INTO worklist 
            (title, type_id, start_day, end_day, start_time, end_time, content, employee_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            title,
            type_id ?? 0,
            start_day,
            end_day,
            start_time || null,
            end_time || null,
            content || null,
            employee_id
        ];

        // db.query -> db.promise().query 로 수정
        const [result] = await db.promise().query(sql, params);

        return res.status(201).json({
            worklist_id: result.insertId,
            title,
            type_id: type_id ?? 0,
            start_day,
            end_day,
            start_time: start_time || null,
            end_time: end_time || null,
            content: content || null,
            employee_id,
            is_completed: 0
        });

    } catch (error) {
        console.error('할 일 등록 DB 오류:', error);
        return res.status(500).json({
            message: '할 일 등록 중 서버 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// GET /api/project/worklist
router.get('/worklist', async (req, res) => {
    try {
        const sql = `
            SELECT 
                w.worklist_id,
                w.title,
                w.type_id,
                w.content,
                DATE_FORMAT(w.start_day, '%Y-%m-%d') AS start,
                DATE_FORMAT(w.end_day, '%Y-%m-%d') AS end,
                w.start_time,
                w.end_time,
                w.employee_id,
                w.is_completed,
                e.name AS writer_name,
                (SELECT COUNT(*) FROM worklist_comments c WHERE c.worklist_id = w.worklist_id) AS comment_count
            FROM worklist w
            LEFT JOIN employees e ON w.employee_id = e.employee_id
            ORDER BY w.worklist_id DESC
        `;

        const [rows] = await db.promise().query(sql);
        return res.status(200).json(rows);

    } catch (error) {
        console.error('할 일 목록 조회 DB 오류:', error);
        return res.status(500).json({
            message: '할 일 목록을 불러오는 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// GET /api/project/worklist/:id (특정 할 일 1개 상세 조회)
router.get('/worklist/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                w.worklist_id,
                w.title,
                w.type_id,
                w.content,
                DATE_FORMAT(w.start_day, '%Y-%m-%d') AS start_day,
                DATE_FORMAT(w.end_day, '%Y-%m-%d') AS end_day,
                w.start_time,
                w.end_time,
                w.employee_id,
                w.is_completed,
                e.name AS writer_name
            FROM worklist w
            LEFT JOIN employees e ON w.employee_id = e.employee_id
            WHERE w.worklist_id = ?
        `;
        const [rows] = await db.promise().query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '해당 할 일을 찾을 수 없습니다.' });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('할 일 상세 조회 오류:', error);
        return res.status(500).json({ message: '상세 조회 실패', error: error.message });
    }
});

router.get('/worklist/:id/comments', async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                c.comment_id,
                c.worklist_id,
                c.parent_comment_id,
                c.employee_id,
                c.content,
                DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
                e.name AS author_name
            FROM worklist_comments c
            LEFT JOIN employees e ON c.employee_id = e.employee_id
            WHERE c.worklist_id = ?
            ORDER BY 
                COALESCE(c.parent_comment_id, c.comment_id) ASC,
                c.parent_comment_id IS NOT NULL ASC,
                c.created_at ASC
        `;
        const [rows] = await db.promise().query(sql, [id]);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('댓글 조회 오류:', error);
        return res.status(500).json({ message: '댓글 조회 실패', error: error.message });
    }
});

// 3) 댓글 또는 대댓글 등록 (POST /api/project/worklist/:id/comments)
router.post('/worklist/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { employee_id, content, parent_comment_id } = req.body;

    if (!employee_id || !content?.trim()) {
        return res.status(400).json({ message: '작성자 정보와 댓글 내용이 필요합니다.' });
    }

    try {
        const sql = `
            INSERT INTO worklist_comments (worklist_id, parent_comment_id, employee_id, content)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.promise().query(sql, [
            id,
            parent_comment_id || null,
            employee_id,
            content.trim()
        ]);

        return res.status(201).json({
            comment_id: result.insertId,
            worklist_id: Number(id),
            parent_comment_id: parent_comment_id || null,
            employee_id,
            content: content.trim()
        });
    } catch (error) {
        console.error('댓글 등록 오류:', error);
        return res.status(500).json({ message: '댓글 등록 실패', error: error.message });
    }
});

module.exports = router;