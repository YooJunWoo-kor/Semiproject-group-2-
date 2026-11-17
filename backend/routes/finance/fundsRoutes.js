const queries = require("../../queries/finance/fundsQueries");
const express = require("express");
const db = require("../../db");
const { payrollPaymentRowsSql, amount } = require("./financeShared");

const router = express.Router();

// 회사계좌 목록 조회
router.get("/bank-accounts", (req, res) => {
    const query = queries.selectBankAccounts;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("회사계좌 목록 조회 오류:", err);

            return res.status(500).json({
                message: "회사계좌 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 회사계좌별 입금·출금 이력 조회
router.get("/bank-accounts/:accountId/payments", (req, res) => {
    const accountId = Number(req.params.accountId);

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    // 선택한 계좌가 존재하는지 확인합니다.
    db.query(
        queries.selectBankAccounts2,
        [accountId],
        (err, accounts) => {
            if (err) {
                console.error("회사계좌 확인 오류:", err);

                return res.status(500).json({
                    message: "회사계좌 확인에 실패했습니다."
                });
            }

            if (accounts.length === 0) {
                return res.status(404).json({
                    message: "해당 회사계좌가 없습니다."
                });
            }

            // 품목 테이블을 연결하지 않아 지급 기록이 중복되지 않습니다.
            const query = queries.selectPayments(payrollPaymentRowsSql);

            db.query(query, [accountId], (err, rows) => {
                if (err) {
                    console.error("계좌 거래내역 조회 오류:", err);

                    return res.status(500).json({
                        message: "계좌 거래내역을 불러오지 못했습니다."
                    });
                }

                res.json(rows);
            });
        }
    );
});

// 회사계좌 신규 등록
router.post("/bank-accounts", (req, res) => {
    const {
        account_number,
        bank_name,
        account_name,
        account_type,
        balance,
        currency,
        employee_id
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function cleanText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    const accountNumber = cleanText(account_number);
    const bankName = cleanText(bank_name);
    const accountName = cleanText(account_name);
    const accountType = cleanText(account_type);

    // 통화를 입력하지 않으면 원화로 등록합니다.
    const accountCurrency =
        cleanText(currency).toUpperCase() || "KRW";

    // 초기 잔액을 입력하지 않으면 0으로 등록합니다.
    const initialBalance =
        balance === "" || balance == null
            ? 0
            : Number(balance);

    // 관리 사원은 선택 항목입니다.
    const employeeId =
        employee_id === "" || employee_id == null
            ? null
            : Number(employee_id);

    // 필수 입력 및 문자열 길이 확인
    if (
        !accountNumber ||
        !bankName ||
        !accountName ||
        accountNumber.length > 50 ||
        bankName.length > 50 ||
        accountName.length > 100 ||
        accountType.length > 30
    ) {
        return res.status(400).json({
            message: "계좌번호와 은행명은 1~50자, 계좌명은 1~100자, 용도는 30자 이내로 입력해 주세요."
        });
    }

    // 이번 입력폼에서는 정수 금액을 사용합니다.
    if (
        !Number.isSafeInteger(initialBalance) ||
        initialBalance < 0
    ) {
        return res.status(400).json({
            message: "초기 잔액은 0 이상의 정수로 입력해 주세요."
        });
    }

    if (!["KRW", "USD", "JPY", "EUR"].includes(accountCurrency)) {
        return res.status(400).json({
            message: "통화는 KRW, USD, JPY, EUR 중에서 선택해 주세요."
        });
    }

    if (
        employeeId !== null &&
        (!Number.isSafeInteger(employeeId) || employeeId <= 0)
    ) {
        return res.status(400).json({
            message: "올바른 관리 사원 ID를 선택해 주세요."
        });
    }

    const query = queries.insertBankAccounts;

    const values = [
        accountNumber,
        bankName,
        accountName,
        accountType || null,
        initialBalance,
        accountCurrency,
        employeeId,
        "사용"
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("회사계좌 등록 오류:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 계좌번호입니다."
                });
            }

            if (err.code === "ER_NO_REFERENCED_ROW_2") {
                return res.status(400).json({
                    message: "존재하지 않는 관리 사원입니다."
                });
            }

            return res.status(500).json({
                message: "회사계좌 등록에 실패했습니다."
            });
        }

        return res.status(201).json({
            message: "회사계좌가 등록되었습니다.",
            account_id: result.insertId
        });
    });
});

// 회사계좌 기본정보 수정
router.put("/bank-accounts/:accountId", (req, res) => {
    const accountId = Number(req.params.accountId);

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    const {
        account_number,
        bank_name,
        account_name,
        account_type,
        employee_id
    } = req.body;

    // 문자열의 앞뒤 공백을 제거합니다.
    function cleanText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    const accountNumber = cleanText(account_number);
    const bankName = cleanText(bank_name);
    const accountName = cleanText(account_name);
    const accountType = cleanText(account_type);

    // 필수 입력 및 길이 확인
    if (
        !accountNumber ||
        !bankName ||
        !accountName ||
        accountNumber.length > 50 ||
        bankName.length > 50 ||
        accountName.length > 100 ||
        accountType.length > 30
    ) {
        return res.status(400).json({
            message: "계좌번호와 은행명은 1~50자, 계좌명은 1~100자, 용도는 30자 이내로 입력해 주세요."
        });
    }

    // 관리 사원을 선택하지 않으면 NULL로 저장합니다.
    const employeeId =
        employee_id === "" || employee_id == null
            ? null
            : Number(employee_id);

    if (
        employeeId !== null &&
        (!Number.isSafeInteger(employeeId) || employeeId <= 0)
    ) {
        return res.status(400).json({
            message: "올바른 관리 사원을 선택해 주세요."
        });
    }

    const query = queries.updateBankAccounts;

    const values = [
        accountNumber,
        bankName,
        accountName,
        accountType || null,
        employeeId,
        accountId
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("회사계좌 수정 오류:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "이미 등록된 계좌번호입니다."
                });
            }

            if (err.code === "ER_NO_REFERENCED_ROW_2") {
                return res.status(400).json({
                    message: "존재하지 않는 관리 사원입니다."
                });
            }

            return res.status(500).json({
                message: "회사계좌 수정에 실패했습니다."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "해당 회사계좌가 없습니다."
            });
        }

        return res.json({
            message: "회사계좌가 수정되었습니다.",
            account_id: accountId
        });
    });
});

// 계좌 관리 사원 선택용 목록 조회
router.get("/employees", (req, res) => {
    const query = queries.selectEmployeeAccounts;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("재무 관리 사원 목록 조회 오류:", err);

            return res.status(500).json({
                message: "관리 사원 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 법인카드 목록 조회
router.get("/corporate-cards", (req, res) => {
    const query = queries.selectCorporateCards;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("법인카드 목록 조회 오류:", err);

            return res.status(500).json({
                message: "법인카드 목록을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
});

// 법인카드 월 한도 변경
router.put("/corporate-cards/:cardId/limit", (req, res) => {
    const cardId = Number(req.params.cardId);
    const { monthly_limit } = req.body;
    const monthlyLimit = Number(monthly_limit);

    // 카드 ID 확인
    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 월 한도는 0 이상의 정수만 허용합니다.
    if (
        monthly_limit == null ||
        String(monthly_limit).trim() === "" ||
        !Number.isSafeInteger(monthlyLimit) ||
        monthlyLimit < 0
    ) {
        return res.status(400).json({
            message: "월 한도는 0 이상의 정수로 입력해 주세요."
        });
    }

    // 한도와 잔여 한도를 함께 변경합니다.
    // 이미 사용한 금액보다 낮은 한도로는 변경하지 않습니다.
    const query = queries.updateCorporateCards;

    db.query(
        query,
        [monthlyLimit, monthlyLimit, cardId, monthlyLimit],
        (err, result) => {
            if (err) {
                console.error("법인카드 한도 변경 오류:", err);

                return res.status(500).json({
                    message: "법인카드 한도 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    message:
                        "카드가 없거나 사용량을 확인할 수 없습니다. 월 한도는 당월 사용량 이상이어야 합니다."
                });
            }

            res.json({
                message: "법인카드 한도가 변경되었습니다.",
                card_id: cardId,
                monthly_limit: monthlyLimit
            });
        }
    );
});

// 법인카드별 사용 이력 조회
router.get("/corporate-cards/:cardId/payments", (req, res) => {
    const cardId = Number(req.params.cardId);

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 해당 카드가 존재하는지 먼저 확인합니다.
    db.query(
        queries.selectCorporateCards2,
        [cardId],
        (cardError, cards) => {
            if (cardError) {
                console.error("법인카드 확인 오류:", cardError);

                return res.status(500).json({
                    message: "법인카드 정보를 확인하지 못했습니다."
                });
            }

            if (cards.length === 0) {
                return res.status(404).json({
                    message: "해당 법인카드를 찾을 수 없습니다."
                });
            }

            // 카드 ID가 연결된 입금·출금 기록을 조회합니다.
            const query = queries.selectPayments2;

            db.query(query, [cardId], (err, rows) => {
                if (err) {
                    console.error("법인카드 사용 이력 조회 오류:", err);

                    return res.status(500).json({
                        message: "법인카드 사용 이력을 불러오지 못했습니다."
                    });
                }

                res.json(rows);
            });
        }
    );
});

// 법인카드 신규 등록
router.post("/corporate-cards", (req, res) => {
    const {
        card_name,
        department_id,
        employee_id,
        monthly_limit
    } = req.body;

    const cardName =
        typeof card_name === "string" ? card_name.trim() : "";

    // 부서와 관리자를 선택하지 않으면 NULL로 저장합니다.
    const departmentId =
        department_id == null || String(department_id).trim() === ""
            ? null
            : Number(department_id);

    const employeeId =
        employee_id == null || String(employee_id).trim() === ""
            ? null
            : Number(employee_id);

    const monthlyLimit = Number(monthly_limit);

    // 카드명 확인
    if (cardName === "" || cardName.length > 50) {
        return res.status(400).json({
            message: "법인카드명은 1~50자로 입력해 주세요."
        });
    }

    // 부서 ID와 관리자 ID 확인
    if (
        (departmentId !== null &&
            (!Number.isSafeInteger(departmentId) || departmentId <= 0)) ||
        (employeeId !== null &&
            (!Number.isSafeInteger(employeeId) || employeeId <= 0))
    ) {
        return res.status(400).json({
            message: "올바른 부서와 관리자를 선택해 주세요."
        });
    }

    // 월 한도 확인
    if (
        monthly_limit == null ||
        String(monthly_limit).trim() === "" ||
        !Number.isSafeInteger(monthlyLimit) ||
        monthlyLimit < 0
    ) {
        return res.status(400).json({
            message: "월 한도는 0 이상의 정수로 입력해 주세요."
        });
    }

    // 신규 카드는 사용량 0원, 잔여 한도는 월 한도와 같게 저장합니다.
    const query = queries.insertCorporateCards;

    db.query(
        query,
        [
            cardName,
            departmentId,
            employeeId,
            monthlyLimit,
            monthlyLimit
        ],
        (err, result) => {
            if (err) {
                console.error("법인카드 등록 오류:", err);

                // 선택한 부서나 사원이 DB에 없는 경우
                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "선택한 부서 또는 관리자가 존재하지 않습니다."
                    });
                }

                return res.status(500).json({
                    message: "법인카드 등록에 실패했습니다."
                });
            }

            res.status(201).json({
                message: "법인카드가 등록되었습니다.",
                card_id: result.insertId
            });
        }
    );
});

// 신규 등록폼에서 선택할 전체 부서와 사원 목록 조회
router.get("/corporate-card-options", (req, res) => {
    db.query(
        queries.selectDepartments,
        (departmentError, departments) => {
            if (departmentError) {
                console.error("법인카드 등록용 부서 조회 오류:", departmentError);
                return res.status(500).json({
                    message: "부서 목록을 불러오지 못했습니다."
                });
            }

            db.query(
                queries.selectEmployees,
                (employeeError, employees) => {
                    if (employeeError) {
                        console.error("법인카드 등록용 관리자 조회 오류:", employeeError);
                        return res.status(500).json({
                            message: "관리자 목록을 불러오지 못했습니다."
                        });
                    }
                    res.json({ departments, employees });
                }
            );
        }
    );
});

// 법인카드 기본정보 수정
router.put("/corporate-cards/:cardId", (req, res) => {
    const cardId = Number(req.params.cardId);

    const {
        card_name,
        department_id,
        employee_id
    } = req.body;

    const cardName =
        typeof card_name === "string" ? card_name.trim() : "";

    // 부서와 관리자를 선택하지 않으면 NULL로 저장합니다.
    const departmentId =
        department_id == null || String(department_id).trim() === ""
            ? null
            : Number(department_id);

    const employeeId =
        employee_id == null || String(employee_id).trim() === ""
            ? null
            : Number(employee_id);

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    if (cardName === "" || cardName.length > 50) {
        return res.status(400).json({
            message: "법인카드명은 1~50자로 입력해 주세요."
        });
    }

    if (
        (departmentId !== null &&
            (!Number.isSafeInteger(departmentId) || departmentId <= 0)) ||
        (employeeId !== null &&
            (!Number.isSafeInteger(employeeId) || employeeId <= 0))
    ) {
        return res.status(400).json({
            message: "올바른 부서와 관리자를 선택해 주세요."
        });
    }

    // 기본정보만 수정하므로 사용량·한도·결제 이력은 유지됩니다.
    const query = queries.updateCorporateCards2;

    db.query(
        query,
        [cardName, departmentId, employeeId, cardId],
        (err, result) => {
            if (err) {
                console.error("법인카드 기본정보 수정 오류:", err);

                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "선택한 부서 또는 관리자가 존재하지 않습니다."
                    });
                }

                return res.status(500).json({
                    message: "법인카드 정보 수정에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "수정할 법인카드를 찾을 수 없습니다."
                });
            }

            res.json({
                message: "법인카드 정보가 수정되었습니다.",
                card_id: cardId
            });
        }
    );
});

// 법인카드 사용 중지·재개
router.put("/corporate-cards/:cardId/status", (req, res) => {
    const cardId = Number(req.params.cardId);
    const { card_status } = req.body;

    if (!Number.isSafeInteger(cardId) || cardId <= 0) {
        return res.status(400).json({
            message: "올바른 카드 ID가 아닙니다."
        });
    }

    // 사용: 결제 가능 / STOP: 새 결제 차단
    if (!["사용", "STOP"].includes(card_status)) {
        return res.status(400).json({
            message: "올바른 카드 상태를 선택해 주세요."
        });
    }

    db.query(
        queries.updateCorporateCards3,
        [card_status, cardId],
        (err, result) => {
            if (err) {
                console.error("법인카드 상태 변경 오류:", err);

                return res.status(500).json({
                    message: "법인카드 상태 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "해당 법인카드를 찾을 수 없습니다."
                });
            }

            res.json({
                message:
                    card_status === "STOP"
                        ? "법인카드 사용이 중지되었습니다."
                        : "법인카드 사용이 재개되었습니다.",
                card_id: cardId,
                card_status
            });
        }
    );
});

// 회사계좌 사용 중지·재개
router.put("/bank-accounts/:accountId/status", (req, res) => {
    const accountId = Number(req.params.accountId);
    const { account_status } = req.body;

    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            message: "올바른 계좌 ID가 아닙니다."
        });
    }

    if (!["사용", "STOP"].includes(account_status)) {
        return res.status(400).json({
            message: "올바른 계좌 상태를 선택해 주세요."
        });
    }

    // 잔액과 거래 이력은 유지하고 상태만 변경합니다.
    db.query(
        queries.updateBankAccounts2,
        [account_status, accountId],
        (err, result) => {
            if (err) {
                console.error("회사계좌 상태 변경 오류:", err);

                return res.status(500).json({
                    message: "회사계좌 상태 변경에 실패했습니다."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "해당 회사계좌를 찾을 수 없습니다."
                });
            }

            res.json({
                message:
                    account_status === "STOP"
                        ? "회사계좌 사용이 중지되었습니다."
                        : "회사계좌 사용이 재개되었습니다.",
                account_id: accountId,
                account_status
            });
        }
    );
});


module.exports = router;
