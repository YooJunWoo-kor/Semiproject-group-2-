import React, { useEffect, useState } from "react";
import { getLoginUser } from "../utils/authStorage";
import DateCount from "./DateCount";
import { API_BASE_URL, LOGIN_USER_KEY } from '../utils/authStorage'
import axios from "axios";

//출근데이터 생성
async function setAttendens(){

    const userInfo = localStorage.getItem(LOGIN_USER_KEY);
    const userID = JSON.parse(userInfo).employeeKey;
    const response = await axios.post(API_BASE_URL + '/AD/setAttendenc', { userID });
    if (!response.data?.success) {
        throw new Error(response.data?.message || '출근 처리 실패');
    }
}
 
//퇴근데이터 생성 및 처리
async function updateAttendens(){
    const userInfo = localStorage.getItem(LOGIN_USER_KEY);
    const userID = JSON.parse(userInfo).employeeKey;
    const response = await axios.post(API_BASE_URL + '/AD/updateAttendens', { userID });
    if (!response.data?.success) {
        throw new Error(response.data?.message || '퇴근 처리 실패');
    }
}

//출결관리 보드입니다.
function ADBord({dataSet, btnStl}){
    let setStyle = btnStl != null ? btnStl : 0;
    dataSet = dataSet == null ? function(){} : dataSet;
    const user = getLoginUser();
    const userName = user?.name;
    const [isAttend, setAttend] = useState(setStyle);

    const [summary, setSummary] = useState({
        lateCount : 0,
        overtimeCount : 0,
        workingMinutes : 0,
    })

    useEffect(() => {
        if (btnStl != null) {
            setAttend(Number(btnStl));
        }
    }, [btnStl]);

    useEffect(() => {
        loadSummary();
    }, [])

    const loadSummary = async () => {
        try{
            const employeeId = Number(getLoginUser()?.employeeKey)

            const response = await axios.get(
                `${API_BASE_URL}/AD/attendance/summary`,
                {
                    params : {employeeId}
                }
            );

            setSummary(response.data.data);
        }
        catch (err){
            console.error('근태 통계 조회 실패:', err);
        }
    }

    return (
        <div className="attendance-card" style={{maxWidth: '250px'}}>
            <div className="attendance-card-header">
            <span className="attendance-badge">근태 관리</span>
            </div>
    
            {/* 인사말(좌)과 현재시각(우)을 한 줄에 배치 */}
            <div className="attendance-info-row">
            <div className="attendance-user-info">
                <span className="user-greeting">반갑습니다, </span>
                <strong className="user-name">{userName}</strong>님
            </div>
            {/* 숫자카운트 */}
            <DateCount />
            </div>
    
            {/* 우측 하단에 정렬되는 출근 버튼 */}
            <div className="attendance-action-group">
                {isAttend == 0 ?
                    <button
                        className="btn-attendance check-in"
                        onClick = {async()=>{
                            try {
                                await setAttendens();
                                await dataSet();
                                await loadSummary();
                                setAttend(1);
                            } catch (error) {
                                console.error('출근 처리 실패:', error);
                            }
                        }}
                    >출근하기</button>:
                isAttend == 1 ?
                    <button
                        className="btn-attendance check-out"
                        onClick = {async()=>{
                            try {
                                await updateAttendens();
                                await dataSet();
                                await loadSummary();
                                setAttend(2);
                            } catch (error) {
                                console.error('퇴근 처리 실패:', error);
                            }
                        }}
                    >퇴근하기</button>:
                <div className="btn-attendance check-ended">근무완료</div>
                }
            </div>
            <div className="badge-container">
                {/* 1. 잔여 연차 태그 (소프트 에메랄드) */}
                <div className="attendance-tag tag-emerald">
                    <span className="tag-label">잔여 연차</span>
                    <span className="tag-value">12.5</span>
                </div>

                {/* 2. 전체 누적 야근 태그 (소프트 앰버) */}
                <div className="attendance-tag tag-amber">
                    <span className="tag-label">야근 횟수</span>
                    <span className="tag-value">{summary.overtimeCount}</span>
                </div>

                {/* 3. 누적 근무 시간 태그 (소프트 블루) */}
                <div className="attendance-tag tag-blue">
                    <span className="tag-label">근무 시간</span>
                    <span className="tag-value">{Math.floor(summary.workingMinutes / 60)}</span>
                </div>

                {/* 4. 지각/이상 태그 (뮤트 레드) */}
                <div className="attendance-tag tag-red">
                    <span className="tag-label">지각 횟수</span>
                    <span className="tag-value">{summary.lateCount}</span>
                </div>
            </div>
            {
                isAttend == 2 ?
                    <div style={{
                        fontSize:'13px'
                        , color: '#aaa'
                    }}>
                        오늘하루도<br/>
                        고생많으셨습니다,<br/>
                        안녕히 가십쇼 :)
                    </div>
                : <div></div>
            }
        </div>
    );
}

export default ADBord;