const express = require('express');
const router = express.Router();
const Draft = require('../models/Draft_function');
const db = require('../db');

function isValidDetailData(detailData) {
    return detailData !== null &&
        typeof detailData === 'object' &&
        !Array.isArray(detailData);
}


// 1. 기안서 임시저장
router.post('/', async (req, res) => {
    const { employeeId, title, documentType, content, detailData = {} } = req.body;

    if (
        !Number.isSafeInteger(employeeId) ||
        employeeId <= 0 ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof documentType !== 'string' ||
        !documentType.trim() ||
        !isValidDetailData(detailData)
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
            content,
            detailData
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
        approverIds,
        detailData = {}
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
        new Set(approverIds).size !== approverIds.length ||
        !isValidDetailData(detailData)
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
            approverIds,
            detailData
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





// 작성자별 기안서 목록 조회
router.get('/', async (req, res) => {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: '올바른 사원 ID가 필요합니다.' });
    }
    try {
        return res.json(await Draft.getByEmployeeId(employeeId));
    } catch (error) {
        console.error('기안서 목록 조회 오류:', error);
        return res.status(500).json({ message: '기안서 목록 조회 실패' });
    }
});

// 내가 결재할 기안서 목록
router.get('/received/list', async (req, res) => {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: '올바른 사원 ID가 필요합니다.' });
    }
    try {
        return res.json(await Draft.getReceivedByEmployeeId(employeeId));
    } catch (error) {
        console.error('결재 수신 목록 조회 오류:', error);
        return res.status(500).json({ message: '결재 수신 목록 조회 실패' });
    }
});

// 내가 승인한 문서 목록
router.get('/approved/list', async (req, res) => {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: '올바른 사원 ID가 필요합니다.' });
    }
    try {
        return res.json(await Draft.getApprovedByEmployeeId(employeeId));
    } catch (error) {
        console.error('승인 목록 조회 오류:', error);
        return res.status(500).json({ message: '승인 목록 조회 실패' });
    }
});

// 임시저장 수정
router.patch('/:draftId', async (req, res) => {
    const draftId = Number(req.params.draftId);
    const { employeeId, title, documentType, content, detailData = {} } = req.body;
    if (!Number.isSafeInteger(draftId) || draftId <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0 ||
        typeof title !== 'string' || !title.trim() ||
        typeof documentType !== 'string' || !documentType.trim() ||
        !isValidDetailData(detailData)) {
        return res.status(400).json({ message: '올바른 기안서 정보가 필요합니다.' });
    }
    try {
        const changed = await Draft.updateDraft(draftId, employeeId, title, documentType, content, detailData);
        if (!changed) return res.status(404).json({ message: '수정 가능한 임시저장 문서가 없습니다.' });
        return res.json({ message: '기안서 수정 완료', draftId });
    } catch (error) {
        console.error('기안서 수정 오류:', error);
        return res.status(500).json({ message: '기안서 수정 실패' });
    }
});

// 임시저장 삭제
router.delete('/:draftId', async (req, res) => {
    const draftId = Number(req.params.draftId);
    const employeeId = Number(req.query.employeeId);
    if (!Number.isSafeInteger(draftId) || draftId <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: '올바른 문서 및 사원 ID가 필요합니다.' });
    }
    try {
        const deleted = await Draft.deleteDraft(draftId, employeeId);
        if (!deleted) return res.status(404).json({ message: '삭제 가능한 임시저장 문서가 없습니다.' });
        return res.json({ message: '기안서 삭제 완료' });
    } catch (error) {
        console.error('기안서 삭제 오류:', error);
        return res.status(500).json({ message: '기안서 삭제 실패' });
    }
});

// 기존 임시저장 문서 상신
router.post('/:draftId/submit', async (req, res) => {
    const draftId = Number(req.params.draftId);
    const { employeeId, approverIds } = req.body;
    if (!Number.isSafeInteger(draftId) || draftId <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0 ||
        !Array.isArray(approverIds) || approverIds.length === 0 ||
        !approverIds.every(id => Number.isSafeInteger(id) && id > 0) ||
        new Set(approverIds).size !== approverIds.length) {
        return res.status(400).json({ message: '결재 요청 정보가 올바르지 않습니다.' });
    }
    try {
        const submitted = await Draft.submitExisting(draftId, employeeId, approverIds);
        if (!submitted) return res.status(404).json({ message: '상신 가능한 임시저장 문서가 없습니다.' });
        return res.json({ message: '기안서 상신 완료', draftId });
    } catch (error) {
        console.error('기안서 상신 오류:', error);
        return res.status(500).json({ message: '기안서 상신 실패' });
    }
});

// 현재 결재자의 승인/반려
router.post('/:draftId/decision', async (req, res) => {
    const draftId = Number(req.params.draftId);
    const { employeeId, decision } = req.body;
    if (!Number.isSafeInteger(draftId) || draftId <= 0 ||
        !Number.isSafeInteger(employeeId) || employeeId <= 0 ||
        !['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ message: '결재 처리 정보가 올바르지 않습니다.' });
    }
    try {
        const changed = await Draft.decide(draftId, employeeId, decision);
        if (!changed) return res.status(409).json({ message: '현재 결재 순서가 아니거나 이미 처리한 문서입니다.' });
        return res.json({ message: decision === 'approve' ? '승인 완료' : '반려 완료' });
    } catch (error) {
        console.error('결재 처리 오류:', error);
        return res.status(500).json({ message: '결재 처리 실패' });
    }
});

//2. 부서 api
router.get('/departments', (req, res) => {
    const sql = `
        SELECT department_id, department_name
            FROM departments
            ORDER BY department_id
    `;

    console.log('부서조회 시작')
    db.query(sql, (err,data) => {
        if(err){
            console.error('부서 조회 실패', err);
            return res.status(500).json({
                message: '부서 조회 실패'
            })
        }

        console.log('부서조회 성공', data);
        res.json(data);
    })
})


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
            document_type: rows[0].document_type,
            content: rows[0].content,
            detail_data: rows[0].detail_data,
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

router.delete('/cancel/:draftId/:employeeId'), (req, res) => {
    const draftId = Number(req.params.draftId);
    const employeeId = Number(req.params.employeeId);


    const sql = `
        DELETE FROM my_draft
        WHERE draft_id = ? AND employee_id = ? AND status = 'PENDING'
    `

    const values = [draftId, employeeId];

    db.query(sql, values, (err, rows) => {
        if(err){
            console.log("기안서 삭제 실패");
            return res.status(500).json({
                message: "삭제 오류"
            })
        }

        return res.json(rows);
    })

    
}


module.exports = router;
