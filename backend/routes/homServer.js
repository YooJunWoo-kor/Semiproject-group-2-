const express =  require('express');
const router = express.Router();
const Attendance = require('../models/Attendance')

//출근버튼 클릭시
router.post('/setAttendenc', async(req, res) =>{
    try{
        const userid = req.body.userID;
        Attendance.setNewDate(userid);
        return res.status(200).json({ success: true, message: '출근 완료' });
    }
    catch(err){
        console.log('useriderr')
        return res.status(500).json({ success: true, message: '출근처리 실패' });
    }
})

//퇴근버튼 클릭시
router.post('/updateAttendens', async(req, res) =>{
    try{
        const userid = req.body.userID;
        Attendance.updateDate(userid);
        return res.status(200).json({ success: true, message: '퇴근 완료' });
    }
    catch(err){
        console.log('useriderr')
        return res.status(200).json({ success: true, message: '퇴근처리 실패' });
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

module.exports = router;