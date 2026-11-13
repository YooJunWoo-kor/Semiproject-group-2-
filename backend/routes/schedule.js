const express =  require('express');
const router = express.Router();
const db = require('../db');

router.post('/setSchedule', (req, res) => {
    const scheduleValue = [
        req.body.title,        //제목
        req.body.scheduleType, //공개여부
        req.body.userID,       //작성자
        req.body.startDay,     //시작일시
        req.body.endDay,       //종료일시
        req.body.startTime,    //시작시간
        req.body.endTime,      //종료시간
        req.body.typeId,       //색상
        req.body.description,  //스케쥴상세내용
    ]

    //참여자 리스트
    const employeeList = req.body.participant;

    const query = `
        INSERT INTO schedule (
            schedule_name,
            schedule_type,
            employee_id,
            start_date,
            end_date,
            start_time,
            end_time,
            type_id,
            description
        ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ? );`

    db.query(query, scheduleValue, (err,data)=>{
        if(err){ 
            console.log('스케쥴등록 db에러', err);
            return res.status(500).json({
                status: false
                ,message : '스케쥴 등록db에러'
            });
        };

        if(data && data.affectedRows > 0){
            console.log('스케쥴 등록완료');

            //스케쥴 리스트에 내 스케줄과 알람설정 등록
            const my_schedule_attendee_value = [
                data.insertId,            //등록된 스케쥴 아이디
                req.body.userID,          //유저리스트
                req.body.isNotifyEnabled, //알람상태
                req.body.timerNum || null,        //타이머시간
                req.body.timerType || null,       //타이머타입 (일, 시, 분)
                req.body.timerTiming || null,     //타이머타이밍 (마감전, 반복)
            ]

            const my_schedule_insert_query = `insert
	            into schedule_attendee (schedule_id, employee_id, isNotifyEnabled, timerNum, timerType, timerTiming)
	            values (?,?,?,?,?,?)`
            
            db.query(my_schedule_insert_query, my_schedule_attendee_value, (msiqErr, msiqData) =>{
                if(msiqErr){
                    console.log('내 스케쥴 등록 DB에러', msiqErr);
                    return res.status(500).json({status:false, massage: '내 스케쥴 등록 DB에러'});
                }
                
                if(msiqData && msiqData.affectedRows > 0){
                    console.log('내 스케쥴 등록 성공');

                    //참여자가 있다면 참여자들 스케쥴 생성
                    if(employeeList > 0){
                        const employeeID = employeeList.map((user)=>{
                            return [data.insertId, user.employeeID];
                        });

                        const scheduleAttendeeQuery = `
                            insert into schedule_attendee ( schedule_id, employee_id )
                            values ( ? )`
                        
                        db.query(scheduleAttendeeQuery, [employeeID], (atErr, atData) =>{
                            if(atErr){
                                console.log('참여자스케쥴등록 db에러');
                                return res.status(500).json({status:false, message: '참여자스케쥴등록 db에러'});
                            }

                            if(atData && atData.affectedRows > 0){
                                console.log('참여자 스케쥴 등록 완료');
                                return res.status(200).json({
                                    status: true
                                    ,message: `'${req.body.title}'일정이 정상적으로 등록되었습니다.`
                                });
                            }

                            else{
                                return res.status(400).json({ status: false ,message: '참여자 스케쥴 등록 실패' });
                            }
                        })
                    }

                    else{
                        return res.status(200).json({
                            status: true
                            ,message: `'${req.body.title}'일정이 정상적으로 등록되었습니다.`
                        });
                    }
                }

                else{
                    console.log('내 스케쥴 등록 실패')
                    return res.status(400).json({status: false, massage: '내 스케쥴 등록 실패'})
                }
            })
        }
        else{
            return res.status(400).json({
                status: false
                ,message: '등록 실패'
            })
        }
    })
})

router.get('/getSchedulData', async (req, res)=>{
    try{
        const [rows] = await db.promise().query(
            `select * from schedule where schedule_type = 'PUBLIC' or schedule_type = 1 order by start_date `
        );

        return res.status(200).json(rows);
    } catch(error){
        console.log('조회 실패', error);
        return res.status(500).json({status:false, massage: '조회실패'});
    }
})

router.post('/getMySchedule', async (req, res) => {
    const employeeID = req.body.userID;
    const query = `
    select *
    from schedule
    where schedule_id in (
        select schedule_id
        from schedule_attendee
        where employee_id = ?
        order by schedule_id
        )`;
        
    db.query(query, employeeID, (err,data)=>{
        if (err) {
            console.error("내 스케줄 DB 오류:", err);
        
            return res.status(500).json({
                status: false,
                message: "내 스케줄 데이터 조회 실패"
            });
        }

        if(data && data.length > 0){
            console.log(data);
            return res.status(200).json(data);
        }
        else{
            console.log('내 스케쥴 데이터 조회 실패', data);
            return res.status(400).json({status: false, data:'내 스케줄 대이터 조회 실패'});
        }
    });
})

// POST /api/schedule/getMyWorklist
router.post('/getMyWorklist', async (req, res) => {
    const { userID } = req.body;
    
    try {
        const sql = `
            SELECT 
                worklist_id,
                title,
                type_id,
                content,
                DATE_FORMAT(start_day, '%Y-%m-%d') AS start,
                DATE_FORMAT(end_day, '%Y-%m-%d') AS end,
                start_time,
                end_time,
                employee_id,
                is_completed
            FROM worklist
            WHERE employee_id = ?
            ORDER BY start_day ASC
        `;

        const [rows] = await db.promise().query(sql, [userID]);

        console.log(`조회된 내 할 일 개수 (${userID}):`, rows.length, '건');
        console.log('조회 결과 데이터:', rows);

        return res.status(200).json(rows);

    } catch (error) {
        console.error('내 할 일 스케줄 조회 DB 오류:', error);
        return res.status(500).json({
            message: '할 일 목록 조회 중 서버 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// POST /api/schedule/getMyAlarms
router.post('/getMyAlarms', (req, res) => {
    const { userID } = req.body;

    if (!userID) {
        return res.status(400).json({ message: 'userID가 필요합니다.' });
    }

    const sql = `
        SELECT 
            s.schedule_id,
            s.schedule_name,
            s.start_date,
            s.end_date,
            sa.timerNum,
            sa.timerType,
            sa.timerTiming
        FROM schedule_attendee sa
        INNER JOIN schedule s ON sa.schedule_id = s.schedule_id
        WHERE sa.employee_id = ?
          AND sa.isNotifyEnabled = '1'
          AND s.end_date >= NOW()
    `;

    db.query(sql, [userID], (err, rows) => {
        if (err) {
            console.error('알람 일정 조회 DB 오류:', err);
            return res.status(500).json({ message: '알람 조회 실패' });
        }
        return res.status(200).json(rows);
    });
});

module.exports = router;