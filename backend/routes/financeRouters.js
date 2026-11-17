const express = require("express");
const router = express.Router();

router.use(require("./finance/partnersRoutes"));
router.use(require("./finance/tradeRoutes"));
router.use(require("./finance/fundsRoutes"));
router.use(require("./finance/payrollRoutes"));
router.use(require("./finance/approvalRoutes"));
router.use(require("./finance/attachmentRoutes"));
router.use(require("./finance/dashboardRoutes"));
router.use(require("./finance/documentRoutes"));
router.use(require("./finance/paymentManagementRoutes"));

module.exports = router;
