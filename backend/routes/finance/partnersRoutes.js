const queries = require("../../queries/finance/partnersQueries");
const express = require("express");
const db = require("../../db");
const { amount } = require("./financeShared");

const router = express.Router();

// 거래처 달력 색상의 종류 ID. 빈 값은 기존 입금/출금 기본 색상을 사용합니다.
function parsePartnerCalendarTypeId(value) {
    if (value === undefined || value === null || value === "") return null;
    if (!((typeof value === "number" && Number.isInteger(value)) ||
        (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)))) return undefined;
    const typeId = Number(value);
    return Number.isInteger(typeId) && typeId >= 0 && typeId <= 255 ? typeId : undefined;
}

// DB 구조 오류는 화면에서도 필요한 조치를 확인할 수 있게 안내합니다.
function partnerDatabaseError(err, fallback) {
    if (err.code === "ER_BAD_FIELD_ERROR") {
        const column = /Unknown column '([^']+)'/.exec(err.sqlMessage || "")?.[1];
        return column === "calendar_type_id"
            ? "일정 색상 저장 컬럼이 없습니다. 동봉된 01_partner_calendar_column.sql을 실행해 주세요."
            : `DB 컬럼을 확인해 주세요${column ? `: ${column}` : ""}. 백엔드 터미널의 오류 내용을 확인해 주세요.`;
    }
    if (err.code === "ER_NO_SUCH_TABLE") {
        return "조회에 필요한 DB 테이블이 없습니다. 백엔드 터미널의 오류 내용을 확인해 주세요.";
    }
    return fallback;
}

// [재무관리] 거래처 목록 조회
router.get("/partners", (req, res) => {
    const query = queries.selectPartners;
    //receivable_amount:매출 거래에서 앞으로 받을 금액
    //payable_amount:매입 거래에서 앞으로 지급할 금액
    //missing_items:품목이 없어 금액 계산을 확인해야 하는 거래 수

    db.query(query, (err, rows) => {
        if (err) {
            console.error("거래처 목록 조회 오류:", err);

            return res.status(500).json({
                message: "거래처 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 목록과 동일한 계산 기준으로 거래별 미정산 금액을 조회합니다.
router.get("/partners/:id/balance-details", (req, res) => {
    const partnerId = Number(req.params.id);
    const tradeType = req.query.trade_type;
    if (!Number.isSafeInteger(partnerId) || partnerId <= 0 || !["매입", "매출"].includes(tradeType)) {
        return res.status(400).json({ message: "거래처와 거래 구분을 확인해 주세요." });
    }
    const direction = tradeType === "매출" ? "입금" : "출금";
    const query = queries.selectTradeTransactions;
    db.query(query, [direction, partnerId, tradeType], (err, rows) => {
        if (err) {
            console.error("거래처 금액 상세 조회 오류:", err);
            return res.status(500).json({ message: partnerDatabaseError(err, "금액 상세정보를 불러오지 못했습니다.") });
        }
        res.json(rows);
    });
});

// [재무관리] 신규 거래처 등록
router.post("/partners", (req, res) => {
    const {
        company_name,
        tax_id,
        representative_name,
        company_phone,
        company_address,
        memo,
        trade_role,
        company_type,
        closing_day,
        calendar_type_id,
        bank_name,
        account_number,
        account_holder
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function optionalText(value) {
        return typeof value === "string" && value.trim() !== ""
            ? value.trim()
            : null;
    }

    const companyName = optionalText(company_name);

    // 회사명은 필수 항목
    if (!companyName) {
        return res.status(400).json({
            message: "거래처명을 입력해 주세요."
        });
    }

    // 거래 구분은 현재 사용하는 DB 값에 맞춥니다.
    if (trade_role !== "매입" && trade_role !== "매출") {
        return res.status(400).json({
            message: "거래 구분을 매입 또는 매출로 선택해 주세요."
        });
    }

    // 마감일을 입력하지 않으면 NULL로 저장
    const closingDay =
        closing_day === "" || closing_day == null
            ? null
            : Number(closing_day);

    if (
        closingDay !== null &&
        (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
    ) {
        return res.status(400).json({
            message: "마감일은 1~31 사이의 정수로 입력해 주세요."
        });
    }

    const calendarTypeId = parsePartnerCalendarTypeId(calendar_type_id);
    if (calendarTypeId === undefined) {
        return res.status(400).json({ message: "일정 색상 값이 올바르지 않습니다." });
    }

    const query = queries.insertPartners;

    const values = [
        companyName,
        optionalText(tax_id),
        optionalText(representative_name),
        optionalText(company_phone),
        optionalText(company_address),
        optionalText(memo),
        trade_role,
        optionalText(company_type),
        closingDay,
        optionalText(bank_name),
        optionalText(account_number),
        optionalText(account_holder),
        calendarTypeId
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("거래처 등록 오류:", err);

            // 사업자번호의 UNIQUE 제약조건에 걸린 경우
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 사업자번호입니다."
                });
            }

            return res.status(500).json({
                message: partnerDatabaseError(err, "거래처 등록에 실패했습니다.")
            });
        }

        return res.status(201).json({
            message: "거래처가 등록되었습니다.",
            partner_id: result.insertId
        });
    });
});

// [재무관리] 거래처 수정
router.put("/partners/:id", (req, res) => {
    const partnerId = Number(req.params.id);

    if (!Number.isInteger(partnerId) || partnerId < 1) {
        return res.status(400).json({
            message: "올바른 거래처 ID가 아닙니다."
        });
    }

    const {
        company_name,
        tax_id,
        representative_name,
        company_phone,
        company_address,
        memo,
        trade_role,
        company_type,
        closing_day,
        calendar_type_id,
        bank_name,
        account_number,
        account_holder
    } = req.body;

    // 선택 항목이 비어 있으면 NULL로 저장합니다.
    function optionalText(value) {
        return typeof value === "string" && value.trim() !== ""
            ? value.trim()
            : null;
    }

    const companyName = optionalText(company_name);

    if (!companyName) {
        return res.status(400).json({
            message: "거래처명을 입력해 주세요."
        });
    }

    if (trade_role !== "매입" && trade_role !== "매출") {
        return res.status(400).json({
            message: "거래 구분을 매입 또는 매출로 선택해 주세요."
        });
    }

    const closingDay =
        closing_day === "" || closing_day == null
            ? null
            : Number(closing_day);

    if (
        closingDay !== null &&
        (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31)
    ) {
        return res.status(400).json({
            message: "마감일은 1~31 사이의 정수로 입력해 주세요."
        });
    }

    const calendarTypeId = parsePartnerCalendarTypeId(calendar_type_id);
    if (calendarTypeId === undefined) {
        return res.status(400).json({ message: "일정 색상 값이 올바르지 않습니다." });
    }

    // 이전 클라이언트가 색상 필드를 보내지 않으면 기존 선택을 유지합니다.
    const hasCalendarColor = Object.prototype.hasOwnProperty.call(req.body, "calendar_type_id");

    // 수정할 거래처가 있는지 먼저 확인합니다.
    db.query(
        queries.selectPartners2,
        [partnerId],
        (err, rows) => {
            if (err) {
                console.error("거래처 확인 오류:", err);
                return res.status(500).json({
                    message: "거래처 확인에 실패했습니다."
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "해당 거래처가 없습니다."
                });
            }

            const query = queries.updatePartners;

            const values = [
                companyName,
                optionalText(tax_id),
                optionalText(representative_name),
                optionalText(company_phone),
                optionalText(company_address),
                optionalText(memo),
                trade_role,
                optionalText(company_type),
                closingDay,
                optionalText(bank_name),
                optionalText(account_number),
                optionalText(account_holder),
                hasCalendarColor ? 1 : 0,
                calendarTypeId,
                partnerId
            ];

            db.query(query, values, (err) => {
                if (err) {
                    console.error("거래처 수정 오류:", err);

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "이미 등록된 사업자번호입니다."
                        });
                    }

                    return res.status(500).json({
                        message: partnerDatabaseError(err, "거래처 수정에 실패했습니다.")
                    });
                }

                res.json({
                    message: "거래처가 수정되었습니다.",
                    partner_id: partnerId
                });
            });
        }
    );
});

// [재무관리] 거래처 삭제
router.delete("/partners/:id", (req, res) => {
    const partnerId = Number(req.params.id);

    // 삭제할 거래처 ID 확인
    if (!Number.isInteger(partnerId) || partnerId < 1) {
        return res.status(400).json({
            message: "올바른 거래처 ID가 아닙니다."
        });
    }

    const query = queries.deletePartners;

    db.query(query, [partnerId], (err, result) => {
        if (err) {
            // 연결된 거래 내역이 있으면 DB에서 삭제를 차단합니다.
            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    message: "연결된 거래 내역이 있어 삭제할 수 없습니다."
                });
            }

            console.error("거래처 삭제 오류:", err);

            return res.status(500).json({
                message: "거래처 삭제에 실패했습니다."
            });
        }

        // 해당 ID의 거래처가 없는 경우
        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "해당 거래처가 없습니다."
            });
        }

        res.json({
            message: "거래처가 삭제되었습니다.",
            partner_id: partnerId
        });
    });
});


module.exports = router;
