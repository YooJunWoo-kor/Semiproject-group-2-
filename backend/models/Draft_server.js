const express = require('express');
const router = express.Router();
const Draft = require('./Draft_function');


// 1. 기안서 임시저장
router.post('/', async (req, res) => {
    const { employeeId, title, documentType, content } = req.body;

    if (
        !Number.isSafeInteger(employeeId) ||
        employeeId <= 0 ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof documentType !== 'string' ||
        !documentType.trim()
    ) {
        return res.status(400).json({
            message: '올바른 사원번호, 제목, 문서 종류가 필요합니다.'
        });
    }

    try {
        const draftId = await Draft.create(
            employeeId,
            title,
            documentType,
            content
        );

        return res.status(201).json({
            message: '기안서 임시저장 성공',
            draftId: draftId
        });
    } catch (error) {
        console.error('기안서 등록 오류:', error);

        return res.status(500).json({
            message: '기안서 등록 중 오류가 발생했습니다.'
        });
    }
});


// 2. 기안서 상신
router.post('/submit', async (req, res) => {
    const {
        employeeId,
        title,
        documentType,
        content,
        approverIds
    } = req.body;

    if (
        !Number.isSafeInteger(employeeId) ||
        employeeId <= 0 ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof documentType !== 'string' ||
        !documentType.trim() ||
        !Array.isArray(approverIds) ||
        approverIds.length === 0 ||
        !approverIds.every(id => Number.isSafeInteger(id) && id > 0) ||
        new Set(approverIds).size !== approverIds.length
    ) {
        return res.status(400).json({
            message: '기안서 정보 또는 결재자 목록이 올바르지 않습니다.'
        });
    }

    try {
        const draftId = await Draft.submit(
            employeeId,
            title,
            documentType,
            content,
            approverIds
        );

        return res.status(201).json({
            message: '기안서 상신 성공',
            draftId: draftId
        });
    } catch (error) {
        console.error('기안서 상신 오류:', error);

        return res.status(500).json({
            message: '기안서 상신 중 오류가 발생했습니다.'
        });
    }
});



// 3. 기안서 상세 조회
router.get('/:draftId', async (req, res) => {
    const draftId = Number(req.params.draftId);

    if (!Number.isSafeInteger(draftId) || draftId <= 0) {
        return res.status(400).json({
            message: '올바른 기안서 번호를 입력해주세요.'
        });
    }

    try {
        const rows = await Draft.getById(draftId);

        if (rows.length === 0) {
            return res.status(404).json({
                message: '기안서를 찾을 수 없습니다.'
            });
        }

        const draft = {
            draft_id: rows[0].draft_id,
            title: rows[0].title,
            status: rows[0].draft_status,

            approvers: rows
                .filter(row => row.step_order !== null)
                .map(row => ({
                    step_order: row.step_order,
                    name: row.approver_name,
                    position: row.position,
                    status: row.step_status
                }))
        };

        return res.status(200).json(draft);

    } catch (error) {
        console.error('기안서 조회 오류:', error);

        return res.status(500).json({
            message: '기안서 조회 중 오류가 발생했습니다.'
        });
    }
});

router.get('/', async (req, res) => {
    
})

// 내가 작성한 기안서 목록 조회
router.get('/', async (req,res) => {
    const employeeId = Number(req.query.employeeId);

    if(!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
            message: '올바른 사원 ID가 필요합니다.'
        });
    }

    try {
        const rows = await Draft.getByEmployeeId(employeeId);

        return res.status(200).json(rows);
    } catch (error) {
        console.error('기안서 목록 조회 오류:', error);

        return res.status(500).json({
            message: '기안서 목록 조회 중 오류가 발생했습니다.'
        })
    }
})

module.exports = router;