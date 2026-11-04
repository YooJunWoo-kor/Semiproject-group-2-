import axios from "axios";

// 재무관리 API 기본 주소
const FINANCE_API_URL = "http://localhost:4000/api/finance";

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
