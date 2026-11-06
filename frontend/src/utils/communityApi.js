
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
export const addFreePost = async (post) => {
    const response = await axios.post(API_URL, post);
    return response.data;
};


// 3. 게시글 수정
export const updateFreePost = async (id, post) => {
    const response = await axios.put(
        `${API_URL}/${id}`,
        post
    );

    return response.data;
};


// 4. 게시글 삭제
export const deleteFreePost = async (id) => {
    const response = await axios.delete(
        `${API_URL}/${id}`
    );

    return response.data;
};


// 5. 직원 정보 조회
export const getEmployee = async (email) => {
    const response = await axios.get(EMPLOYEE_API_URL, {
        params: { email: email }
    });

    return response.data;
};


// 6. 댓글 등록
export const addFreeComment = async (postId, comment) => {
    const response = await axios.post(
        `${API_URL}/${postId}/comments`,
        comment
    );

    return response.data;
};


// 7. 댓글 삭제
export const deleteFreeComment = async (commentId) => {
    const response = await axios.delete(
        `${API_BASE_URL}/community/comments/${commentId}`
    );

    return response.data;
};
