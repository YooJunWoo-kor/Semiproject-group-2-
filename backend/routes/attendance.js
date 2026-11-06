const express = require('express');
const Attendance = require('../models/Attendance');
const router = express.Router();

router.post('/attendance', async (req, res) =>{
        try{
            const empNumber = req.body?.empNumber ?? req.body?.userID;
            const records = await Attendance.getData(empNumber);

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
