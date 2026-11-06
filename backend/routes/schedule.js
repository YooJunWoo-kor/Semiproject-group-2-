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
        req.body.typeId,          //색상
        req.body.description,  //스케쥴상세내용
    ]

    const schedule_attendee_value = [
        req.body.participant,     //유저리스트
        req.body.isNotifyEnabled, //알람상태
        req.body.timerNum,        //타이머시간
        req.body.timerType,       //타이머타입 (일, 시, 분)
        req.body.timerTiming,     //타이머타이밍 (마감전, 반복)

    ]

    const query = `INSERT INTO schedule (
                        schedule_name,
                        schedule_type,
                        creator_id,
                        start_date,
                        end_date,
                        start_time,
                        end_time,
                        type_id,
                        description
                    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ? );`

    db.query(query, scheduleValue, (err,data)=>{
        if(err){ 
            console.log('스케쥴등록 db에러');
            return res.status(500).json({
                status: false
                ,message : '스케쥴 등록db에러'
            });
        };

        if(data && data.affectedRows > 0){
            console.log('등록완료');
            return res.status(200).json({
                status: true
                ,message: `'${req.body.title}'일정이 정상적으로 등록되었습니다.`
            });
        }
        else{
            return res.status(400).json({
                status: false
                ,message: '등록 실패'
            })
        }
    })
})

module.exports = router;