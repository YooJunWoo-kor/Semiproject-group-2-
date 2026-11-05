const express =  require('express');
const router = express.Router();

router.post('/setSchedule', (req, res) => {
    const value = [
        req.body.userID,
        req.body.title,
        req.body.startDay,
        req.body.endDay,
        req.body.participant,
        req.body.visible,
        req.body.velues,
        req.body.isNotifyEnabled,
        req.body.timerNum,
        req.body.timerType,
        req.body.timerTiming
    ]
    console.log(value);
})

module.exports = router;