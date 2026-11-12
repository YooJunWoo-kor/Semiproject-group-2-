import axios from "axios";
import {API_BASE_URL} from "./authStorage";

// 재무관리 API 기본 주소
const FINANCE_API_URL = API_BASE_URL+"/finance";

// 거래처 목록 조회
export async function getPartners() {
    // 백엔드에 거래처 목록을 요청합니다.
    const response = await axios.get(`${FINANCE_API_URL}/partners`);

    // 응답에서 실제 거래처 데이터만 반환합니다.
    return response.data;
}

// 신규 거래처 등록
export async function createPartner(partnerData) {
    // 입력한 거래처 정보를 백엔드로 보냅니다.
    const response = await axios.post(
        `${FINANCE_API_URL}/partners`,
        partnerData
    );

    // 등록 결과와 생성된 거래처 ID를 반환합니다.
    return response.data;
}

// 거래처 정보 수정 (partnerId:수정할 거래처 ID로 수정할 거래처를 지정, partnerData:수정한 입력폼 데이터)
export async function updatePartner(partnerId, partnerData) {
    const response = await axios.put(
        `${FINANCE_API_URL}/partners/${partnerId}`,
        partnerData
    );
    return response.data;
}

// 거래처 삭제 
export async function deletePartner(partnerId) {
    const response = await axios.delete(
        `${FINANCE_API_URL}/partners/${partnerId}`
    );

    return response.data;
}

// 매입·매출 거래 품목 목록 조회
export async function getItems() {
    const response = await axios.get(
        `${FINANCE_API_URL}/items`
    );

    return response.data;
}

// 신규 거래 및 품목 등록
export async function createItem(itemData) {
    // 입력한 거래처, 거래일, 품목, 금액 정보를 서버로 보냅니다.
    const response = await axios.post(
        `${FINANCE_API_URL}/items`,
        itemData
    );

    // 서버에서 반환한 등록 결과를 전달합니다.
    return response.data;
}

// 거래 품목 수정
export async function updateItem(itemId, itemData) {
    const response = await axios.put(
        `${FINANCE_API_URL}/items/${itemId}`,
        itemData
    );

    return response.data;
}

// 거래 품목 삭제
export async function deleteItem(itemId) {
    const response = await axios.delete(
        `${FINANCE_API_URL}/items/${itemId}`
    );

    return response.data;
}

// 거래에 대한 입금·출금 등록
export async function createPayment(transactionId, paymentData) {
    const response = await axios.post(
        `${FINANCE_API_URL}/transactions/${transactionId}/payments`,
        paymentData
    );

    return response.data;
}

// 거래별 입금·출금 이력 및 정산 금액 조회
export async function getTransactionPayments(transactionId) {
    const response = await axios.get(
        `${FINANCE_API_URL}/transactions/${transactionId}/payments`
    );

    return response.data;
}

// 회사계좌 목록 조회
export async function getBankAccounts() {
    const response = await axios.get(
        `${FINANCE_API_URL}/bank-accounts`
    );

    return response.data;
}

// 회사계좌 신규 등록
export async function createBankAccount(accountData) {
    const response = await axios.post(
        `${FINANCE_API_URL}/bank-accounts`,
        accountData
    );

    return response.data;
}

// 회사계좌 정보 수정
export async function updateBankAccount(accountId, accountData) {
    const response = await axios.put(
        `${FINANCE_API_URL}/bank-accounts/${accountId}`,
        accountData
    );

    return response.data;
}

// 회사계좌별 입금·출금 이력 조회
export async function getBankAccountPayments(accountId) {
    const response = await axios.get(
        `${FINANCE_API_URL}/bank-accounts/${accountId}/payments`
    );

    return response.data;
}

// 재무 관리 사원 선택용 목록 조회
export async function getFinanceEmployees() {
    const response = await axios.get(
        `${FINANCE_API_URL}/employees`
    );

    return response.data;
}

// 법인카드 목록 조회
export async function getCorporateCards() {
    const response = await axios.get(
        `${FINANCE_API_URL}/corporate-cards`
    );

    return response.data;
}

// 법인카드 월 한도 변경
export async function updateCorporateCardLimit(cardId, monthlyLimit) {
    const response = await axios.put(
        `${FINANCE_API_URL}/corporate-cards/${cardId}/limit`,
        { monthly_limit: monthlyLimit }
    );

    return response.data;
}

// 법인카드별 사용 이력 조회
export async function getCorporateCardPayments(cardId) {
    const response = await axios.get(
        `${FINANCE_API_URL}/corporate-cards/${cardId}/payments`
    );

    return response.data;
}

// 법인카드 신규 등록
export async function createCorporateCard(cardData) {
    const response = await axios.post(
        `${FINANCE_API_URL}/corporate-cards`,
        cardData
    );

    return response.data;
}

// 부서와 관리자 목록을 가져오는 함수
export async function getCorporateCardOptions() {
    const response = await axios.get(
        `${FINANCE_API_URL}/corporate-card-options`
    );
    return response.data;
}

// 법인카드 기본정보 수정
export async function updateCorporateCard(cardId, cardData) {
    const response = await axios.put(
        `${FINANCE_API_URL}/corporate-cards/${cardId}`,
        cardData
    );

    return response.data;
}

// 법인카드 상태 변경
export async function updateCorporateCardStatus(cardId, status) {
    const response = await axios.put(
        `${FINANCE_API_URL}/corporate-cards/${cardId}/status`,
        { card_status: status }
    );

    return response.data;
}

// 회사계좌 상태 변경
export async function updateBankAccountStatus(accountId, status) {
    const response = await axios.put(
        `${FINANCE_API_URL}/bank-accounts/${accountId}/status`,
        { account_status: status }
    );

    return response.data;
}

// 결재 문서 목록 조회
export async function getApprovals() {
    const response = await axios.get(
        `${FINANCE_API_URL}/approvals`
    );

    return response.data;
}

// 문서별 결재자와 처리 이력 조회
export async function getApprovalSteps(documentId) {
    const response = await axios.get(
        `${FINANCE_API_URL}/approvals/${documentId}/steps`
    );

    return response.data;
}

// 결재 기안 신규 등록
export async function createApproval(approvalData) {
    const response = await axios.post(
        `${FINANCE_API_URL}/approvals`,
        approvalData
    );

    return response.data;
}

// 지정 결재자의 승인·반려 처리
export async function decideApproval(documentId, decisionData) {
    const response = await axios.patch(
        `${FINANCE_API_URL}/approvals/${documentId}/decision`,
        decisionData
    );
    return response.data;
}

// 결재 문서에 증빙파일 첨부
export async function uploadApprovalAttachment(documentId, file, employeeId, password) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", employeeId);
    formData.append("password", password);
    const response = await axios.post(
        `${FINANCE_API_URL}/approvals/${documentId}/attachments`, formData
    );
    return response.data;
}

// 결재 문서의 첨부파일 목록 조회
export async function getApprovalAttachments(documentId) {
    const response = await axios.get(
        `${FINANCE_API_URL}/approvals/${documentId}/attachments`
    );
    return response.data;
}

// 첨부파일을 Blob(브라우저가 저장할 파일 데이터)으로 받습니다.
export async function downloadApprovalAttachment(documentId, fileId) {
    try {
        const response = await axios.get(
            `${FINANCE_API_URL}/approvals/${documentId}/attachments/${fileId}/download`,
            { responseType: "blob" }
        );
        return response.data;
    } catch (error) {
        // 다운로드 요청에서는 서버의 JSON 오류도 Blob으로 올 수 있습니다.
        const data = error.response?.data;
        if (typeof data?.text === "function") {
            try {
                error.response.data = JSON.parse(await data.text());
            } catch {
                // JSON이 아니면 화면의 기본 오류 안내를 사용합니다.
            }
        }
        throw error;
    }
}

// 결재 문서별 지급 현황과 내역 조회
export async function getApprovalPayments(documentId) {
    const response = await axios.get(`${FINANCE_API_URL}/approvals/${documentId}/payments`);
    return response.data;
}

// 승인된 결재 문서의 지급 등록
export async function createApprovalPayment(documentId, paymentData) {
    const response = await axios.post(`${FINANCE_API_URL}/approvals/${documentId}/payments`, paymentData);
    return response.data;
}

// 결제 관리의 기간별 입출금, 미정산 잔액, 분류 목록
export async function getPaymentManagement(params) {
    const response = await axios.get(`${FINANCE_API_URL}/payment-management`, { params });
    return response.data;
}

export async function savePaymentClassification(data) {
    const response = await axios.put(`${FINANCE_API_URL}/payment-management/classification`, data);
    return response.data;
}
