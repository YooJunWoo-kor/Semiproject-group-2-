-- 기존 미확정 급여를 프리랜서 3.3% 계산 기준으로 보정합니다.
-- 확정 및 지급완료 급여는 과거 이력 보존을 위해 변경하지 않습니다.

UPDATE payrolls
SET gross_pay = base_salary + allowance + bonus + other_payment,
    income_tax = FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100),
    local_income_tax = FLOOR(
        FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100) * 10 / 100
    ),
    deduction = FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100)
        + FLOOR(
            FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100) * 10 / 100
        ),
    net_pay = base_salary + allowance + bonus + other_payment
        - FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100)
        - FLOOR(
            FLOOR((base_salary + allowance + bonus + other_payment) * 3 / 100) * 10 / 100
        )
WHERE payment_status IS NULL
   OR payment_status IN ('지급대기', '작성중');
