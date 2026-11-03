import React, { useState } from "react";
import { getLoginUser } from "../utils/authStorage";
import DateCount from "./DateCount";

//출결관리 보드입니다.
function ADBord(){
    const user = getLoginUser();
    const userName = user?.name;

    const [isAttend, setAttend] = useState(0);

    return (
        <div className="attendance-card">
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
                        onClick = {()=>{setAttend(1)}}
                    >출근하기</button>:
                isAttend == 1 ?
                    <button
                        className="btn-attendance check-out"
                        onClick = {()=>{setAttend(2)}}
                    >퇴근하기</button>:
                <div className="btn-attendance check-ended">근무완료</div>
                }
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