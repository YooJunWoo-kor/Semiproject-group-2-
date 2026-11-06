import axios from 'axios';
import { API_BASE_URL } from '../utils/authStorage';

// MySQL departments 테이블에서 부서 목록 조회
export async function getDepartments() {
    const response = await axios.get(API_BASE_URL + '/departments');
    return response.data;
}
