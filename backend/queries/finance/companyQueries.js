// [회사 정보 DB 연동] company_id가 가장 작은 회사를 우리 회사로 사용합니다.
// 문서에서 사용하던 필드명으로 맞춰 프론트 코드를 그대로 사용합니다.
const selectDocumentBusiness = `
    SELECT company_name AS name, email, address, country, phone,
           business_number AS businessNumber
    FROM company_info
    ORDER BY company_id ASC
    LIMIT 1
`;

module.exports = { selectDocumentBusiness };
