import axios from 'axios';
import { API_BASE_URL } from './authStorage';

// 백엔드 자유게시판 API 주소
const API_URL = API_BASE_URL + '/community/free-posts';

// 직원 정보 API 주소
const EMPLOYEE_API_URL = API_BASE_URL + '/community/employee';

// 1. 게시글 전체 조회
export const getFreePosts = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// 2. 게시글 등록
export const addFreePost = async post => {
    const response = await axios.post(API_URL, post);
    return response.data;
};

// 3. 게시글 수정
export const updateFreePost = async (postId, post) => {
    const response = await axios.put(`${API_URL}/${postId}`, post);
    return response.data;
};

// 4. 게시글 삭제
export const deleteFreePost = async postId => {
    const response = await axios.delete(`${API_URL}/${postId}`);
    return response.data;
};

// 5. 직원 정보 조회
export const getEmployee = async email => {
    const response = await axios.get(EMPLOYEE_API_URL, {
        params: {
            email
        }
    });
    return response.data;
};

// 6. 댓글 등록
export const addFreeComment = async (postId, comment) => {
    const response = await axios.post(`${API_URL}/${postId}/comments`, comment);
    return response.data;
};

// 7. 댓글 삭제
export const deleteFreeComment = async commentId => {
    const response = await axios.delete(`${API_BASE_URL}/community/comments/${commentId}`);
    return response.data;
};

// ===== [추가] 공지사항 목록 조회 API 시작 =====

// 8. 공지사항 전체 조회
export const getNotices = async () => {
    const response = await axios.get(`${API_BASE_URL}/community/notices`);
    return response.data;
};

// ===== [추가] 공지사항 목록 조회 API 끝 =====

// [추가] 업무자료실 목록 조회
export const getTechLibraryPosts = async () => (await axios.get(API_BASE_URL + '/community/tech-library')).data;

// ===== [추가] 업무자료실 글·댓글 API 시작 =====
// [수정] 첨부파일 없이 본문을 JSON으로 전달합니다.
export const addTechLibraryPost = async post => {
    const response = await axios.post(`${API_BASE_URL}/community/tech-library`, post);
    return response.data;
};
export const updateTechLibraryPost = async (postId, post) => {
    const response = await axios.put(`${API_BASE_URL}/community/tech-library/${postId}`, post);
    return response.data;
};
export const deleteTechLibraryPost = async postId => {
    const response = await axios.delete(`${API_BASE_URL}/community/tech-library/${postId}`);
    return response.data;
};
export const addTechLibraryComment = async (postId, comment) => {
    const response = await axios.post(`${API_BASE_URL}/community/tech-library/${postId}/comments`, comment);
    return response.data;
};
export const deleteTechLibraryComment = async (postId, commentId) => {
    const response = await axios.delete(`${API_BASE_URL}/community/tech-library/${postId}/comments/${commentId}`);
    return response.data;
};
// ===== [추가] 업무자료실 글·댓글 API 끝 =====

// ===== [추가] 공지사항 등록·수정·삭제 호출 시작 =====
export const addNotice = async post => {
    const response = await axios.post(API_BASE_URL + '/community/notices', post);
    return response.data;
};
export const updateNotice = async (postId, post) => {
    const response = await axios.put(API_BASE_URL + '/community/notices/' + postId, post);
    return response.data;
};
export const deleteNotice = async postId => {
    const response = await axios.delete(API_BASE_URL + '/community/notices/' + postId);
    return response.data;
};
// ===== [추가] 공지사항 등록·수정·삭제 호출 끝 =====

// [추가] 공지사항 댓글 등록
export const addNoticeComment = async (postId, comment) => {
    const response = await axios.post(API_BASE_URL + '/community/notices/' + postId + '/comments', comment);
    return response.data;
};

// ===== [추가] Q&A 글·댓글 API 시작 =====
export const getQnAPosts = async () => (await axios.get(API_BASE_URL + '/community/qna')).data;
export const addQnAPost = async post => (await axios.post(API_BASE_URL + '/community/qna', post)).data;
export const updateQnAPost = async (postId, post) => (await axios.put(API_BASE_URL + '/community/qna/' + postId, post)).data;
export const deleteQnAPost = async postId => (await axios.delete(API_BASE_URL + '/community/qna/' + postId)).data;
export const addQnAComment = async (postId, comment) => (await axios.post(API_BASE_URL + '/community/qna/' + postId + '/comments', comment)).data;
export const deleteQnAComment = async (postId, commentId) => (await axios.delete(API_BASE_URL + '/community/qna/' + postId + '/comments/' + commentId)).data;
// ===== [추가] Q&A 글·댓글 API 끝 =====

// ===== [추가] 개선 건의 글·댓글 API 시작 =====
export const getSuggestionPosts = async () => (await axios.get(API_BASE_URL + '/community/suggestions')).data;
export const addSuggestionPost = async post => (await axios.post(API_BASE_URL + '/community/suggestions', post)).data;
export const updateSuggestionPost = async (postId, post) => (await axios.put(API_BASE_URL + '/community/suggestions/' + postId, post)).data;
export const deleteSuggestionPost = async postId => (await axios.delete(API_BASE_URL + '/community/suggestions/' + postId)).data;
export const addSuggestionComment = async (postId, comment) => (await axios.post(API_BASE_URL + '/community/suggestions/' + postId + '/comments', comment)).data;
export const deleteSuggestionComment = async (postId, commentId) => (await axios.delete(API_BASE_URL + '/community/suggestions/' + postId + '/comments/' + commentId)).data;
// ===== [추가] 개선 건의 글·댓글 API 끝 =====

// [병합 수정] kds 브랜치의 댓글 수정 기능 유지
export const updateFreeComment = async (commentId, comment) => {
    const response = await axios.put(`${API_BASE_URL}/community/comments/${commentId}`, comment);
    return response.data;
};

// ===== [추가] 댓글 수정·삭제 및 공지 조회수 =====
export const updateNoticeComment = async (postId, commentId, comment) => (await axios.put(API_BASE_URL + '/community/notices/' + postId + '/comments/' + commentId, comment)).data;
export const deleteNoticeComment = async (postId, commentId) => (await axios.delete(API_BASE_URL + '/community/notices/' + postId + '/comments/' + commentId)).data;
export const updateTechLibraryComment = async (postId, commentId, comment) => (await axios.put(API_BASE_URL + '/community/tech-library/' + postId + '/comments/' + commentId, comment)).data;
export const updateQnAComment = async (postId, commentId, comment) => (await axios.put(API_BASE_URL + '/community/qna/' + postId + '/comments/' + commentId, comment)).data;
export const updateSuggestionComment = async (postId, commentId, comment) => (await axios.put(API_BASE_URL + '/community/suggestions/' + postId + '/comments/' + commentId, comment)).data;
export const recordNoticeView = async postId => (await axios.post(API_BASE_URL + '/community/notices/' + postId + '/view')).data;

// ===== [추가] 통합게시판 목록 조회 시작 =====
export const getCommunityPosts = async () => {
    const response = await axios.get(
        `${API_BASE_URL}/community/posts`
    );

    return response.data;
};
// ===== [추가] 통합게시판 목록 조회 끝 =====
