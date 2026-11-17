import React, { useEffect, useState } from "react";
import { getLoginUser, API_BASE_URL, LOGIN_USER_KEY } from "../utils/authStorage";
import DateCount from "./DateCount";
import axios from "axios";

//출근데이터 생성
async function setAttendens() {
    const userInfo = localStorage.getItem(LOGIN_USER_KEY);
    const userID = JSON.parse(userInfo).employeeKey;
    try {
        const data = await axios.post(API_BASE_URL + '/AD/setAttendenc', { userID });
    } catch (error) {
    }
}

//퇴근데이터 생성 및 처리
async function updateAttendens() {
    const userInfo = localStorage.getItem(LOGIN_USER_KEY);
    const userID = JSON.parse(userInfo).employeeKey;
    try {
        const data = await axios.post(API_BASE_URL + '/AD/updateAttendens', { userID });
    } catch (error) {
        //console.log('데이터 전송 실패');
    }
}

//출결관리 보드입니다.
function ADBord({ dataSet, btnStl }) {
    let setStyle = btnStl != null ? btnStl : 0;
    dataSet = dataSet == null ? function () { } : dataSet;
    const user = getLoginUser();
    const userName = user?.name;
    const [isAttend, setAttend] = useState(setStyle);

    useEffect(() => {
        if (btnStl != null) {
            setAttend(Number(btnStl));
        }
    }, [btnStl]);

    // 버튼을 누른 현재 시각으로 판별합니다.
    function checkAttendance(type) {
        const now = new Date();
        const time =
            now.getHours() * 3600 +
            now.getMinutes() * 60 +
            now.getSeconds();

        const result = [];

        if (type === '출근') {
            result.push('출근');
            if (time >= 9 * 3600 + 1) result.push('지각'); 
        }

        if (type === '퇴근') {
            if (time < 18 * 3600) result.push('조퇴'); 
            if (time > 18 * 3600) result.push('퇴근');
            if (time >= 19 * 3600) result.push('야근');
        }

        return result;
    }

    return (
        <div className="attendance-card" style={{ maxWidth: '250px' }}>
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
                        onClick={async () => {
                            await setAttendens();
                            await dataSet();
                            setAttend(1);
                        }}
                    >출근하기</button> :
                    isAttend == 1 ?
                        <button
                            className="btn-attendance check-out"
                            onClick={async () => {
                                await updateAttendens();
                                await dataSet();
                                setAttend(2);
                            }}
                        >퇴근하기</button> :
                        <div className="btn-attendance check-ended">근무완료</div>
                }
            </div>
            <div className="badge-container">
                {/* 1. 잔여 연차 태그 (소프트 에메랄드) */}
                <div className="attendance-tag tag-emerald">
                    <span className="tag-label">잔여 연차</span>
                    <span className="tag-value">12.5</span>
                </div>

                {/* 2. 이번 달 야근 태그 (소프트 앰버) */}
                <div className="attendance-tag tag-amber">
                    <span className="tag-label">야근 횟수</span>
                    <span className="tag-value">3</span>
                </div>

                {/* 3. 누적 근무 시간 태그 (소프트 블루) */}
                <div className="attendance-tag tag-blue">
                    <span className="tag-label">근무 시간</span>
                    <span className="tag-value">168</span>
                </div>

                {/* 4. 지각/이상 태그 (뮤트 레드) */}
                <div className="attendance-tag tag-red">
                    <span className="tag-label">지각 횟수</span>
                    <span className="tag-value">0</span>
                </div>
            </div>
            {
                isAttend == 2 ?
                    <div style={{
                        fontSize: '13px'
                        , color: '#aaa'
                    }}>
                        오늘하루도<br />
                        고생많으셨습니다,<br />
                        안녕히 가십쇼 :)
                    </div>
                    : <div></div>
            }
        </div>
    );
}

export default ADBord;