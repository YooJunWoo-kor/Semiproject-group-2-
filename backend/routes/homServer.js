const express =  require('express');
const router = express.Router();
const Attendance = require('../models/Attendance')

//출근버튼 클릭시
router.post('/setAttendenc', async(req, res) =>{
    try{
        const userid = req.body.userID;
        await Attendance.setNewDate(userid);
        return res.status(200).json({ success: true, message: '출근 완료' });
    }
    catch(err){
        console.error('출근 처리 실패', err);
        return res.status(500).json({ success: false, message: '출근처리 실패' });
    }
})

//퇴근버튼 클릭시
router.post('/updateAttendens', async(req, res) =>{
    try{
        const userid = req.body.userID;
        await Attendance.updateDate(userid);
        return res.status(200).json({ success: true, message: '퇴근 완료' });
    }
    catch(err){
        console.error('퇴근 처리 실패', err)
        return res.status(500).json({ success: false, message: '퇴근처리 실패' });
    }
})

//출결관련 데이터 get
router.post('/attendance', async (req, res) =>{
        try{
            const userID = req.body.userID;
            const records = await Attendance.getData(userID);
            res.json({
                result: 'success',
                data: records
            });
        }
        catch(err){
            return res.json({result:'fail'}) 
        }
    }
)

router.get('/attendance/summary', async(req, res) => {
    try {
        const employeeId = Number(req.query.employeeId) // url ?뒤 값 

        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: '올바른 직원 ID가 필요합니다.'
            });
        }

        const summary = await Attendance.getAttendanceSummary(employeeId)

        return res.status(200).json({
            success:true,
            data: summary
        })

    }
    catch(err){
        console.error('근태 통계 조회 실패 : ', err);
        return res.status(500).json({ success: false, message: '근태 통계 조회 실패' });
    }
})

module.exports = router;