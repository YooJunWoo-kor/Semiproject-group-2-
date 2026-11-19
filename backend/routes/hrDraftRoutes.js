// HR 기안 연동 라우터
// 역할: 승인된 수당·상여금·비용 기안을 급여에 반영합니다.

const express = require('express');
const { applyApprovedDraftsHandler } = require('../services/hrDraftApplication');

const hrDraftRouter = express.Router();

// 승인 기안 급여 반영: 수당·상여금·비용 기안을 작성중 급여에 연결합니다.
hrDraftRouter.post('/payrolls/apply-approved-drafts', (req, res) =>
    applyApprovedDraftsHandler(req, res)
);

module.exports = hrDraftRouter;
