import React, { useState } from "react";
import axios from "axios";
import { TOGLE_COLORS, getLoginUser, API_BASE_URL } from "../../../../utils/authStorage"; // getLoginUser 위치에 맞게 임포트

function NewWorkList({ onAddSuccess }) {
    const [title, setTitle] = useState("");
    const [typeId, setTypeId] = useState(0);
    const [startDay, setStartDay] = useState("");
    const [endDay, setEndDay] = useState("");
    const [content, setContent] = useState("");

    const handleRegister = async () => {
        // 1. 필수 입력값 검증
        if (!title.trim()) {
            alert("할 일 제목을 입력해주세요.");
            return;
        }
        if (!startDay || !endDay) {
            alert("시작일과 마감일을 선택해주세요.");
            return;
        }
        if (startDay > endDay) {
            alert("마감일은 시작일보다 빠를 수 없습니다.");
            return;
        }

        // 2. 로컬스토리지에서 로그인한 작성자 정보 가져오기
        const loginUser = getLoginUser();
        const employeeId = loginUser?.employeeKey || loginUser?.id;

        if (!employeeId) {
            alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
            return;
        }

        // 3. 백엔드 DB(worklist 테이블) 컬럼명과 일치시킨 전송 객체
        const newWorkData = {
            title: title.trim(),
            type_id: Number(typeId), // 색상 인덱스(필요 시 DB 컬럼 추가)
            start_day: startDay,
            end_day: endDay,
            content: content.trim(),
            employee_id: employeeId
        };

        try {
            // 4-A. 백엔드 API로 전송 (Express 라우터 주소에 맞게 수정)
            const response = await axios.post(API_BASE_URL+"/project/new-worklist", newWorkData);

            if (response.status === 200 || response.status === 201) {
                alert("할 일이 등록되었습니다.");

                // 부모 컴포넌트의 할 일 목록 state 즉시 갱신 (콜백이 전달된 경우)
                if (onAddSuccess) {
                    onAddSuccess(response.data);
                }

                // 입력 폼 초기화
                setTitle("");
                setTypeId(0);
                setStartDay("");
                setEndDay("");
                setContent("");
            }
        } catch (error) {
            console.error("할 일 등록 실패:", error);
            alert("할 일 등록 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="vertical-box">
            <h4>할 일 추가</h4>
            <form className="vertical-box" onSubmit={(e) => e.preventDefault()}>
                <div className="horizontal-box">
                    <p className="formText">제목</p>
                    <input
                        className="size-fill"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="할 일 제목 입력"
                    />
                    <select
                        style={{
                            width: "100px",
                            color: TOGLE_COLORS[typeId]
                        }}
                        value={typeId}
                        onChange={(e) => setTypeId(Number(e.target.value))}
                    >
                        {TOGLE_COLORS.map((item, index) => (
                            <option
                                key={index}
                                value={index}
                                style={{ color: item }}
                            >
                                ●
                            </option>
                        ))}
                    </select>
                </div>

                <div className="horizontal-box">
                    <div className="vertical-box size-fill">
                        <p className="formText">시작일</p>
                        <input
                            type="date"
                            value={startDay}
                            onChange={(e) => setStartDay(e.target.value)}
                        />
                    </div>
                    <div className="vertical-box size-fill">
                        <p className="formText">마감일</p>
                        <input
                            type="date"
                            value={endDay}
                            onChange={(e) => setEndDay(e.target.value)}
                        />
                    </div>
                </div>

                <div className="vertical-box">
                    <p className="formText">내용</p>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="내용 입력"
                    />
                </div>

                <div>
                    <button
                        type="button"
                        className="register-btn"
                        onClick={handleRegister}
                    >
                        할 일 등록
                    </button>
                </div>
            </form>
        </div>
    );
}

export default NewWorkList;