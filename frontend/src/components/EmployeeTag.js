import axios from "axios";
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/authStorage";

function EmployeeTage({ id }) {
    const [member, setMember] = useState(null);
    const [isOpen, setIsOpen] = useState(false); // 💡 사원정보 보드 열림/닫힘 상태

    const getMember = async () => {
        let data = await axios.post(
            API_BASE_URL + "/project/get_employee",
            { employee_id: id }
        );
        setMember(data.data.data[0]);
    };

    useEffect(() => {
        if (id) getMember();
    }, [id]);

    return (
        <button
            type="button"
            key={id}
            className="attendee-tag"
            style={{ position: "relative" }} // 💡 자식 absolute 기준점 고정
            onClick={() => setIsOpen((prev) => !prev)} // 클릭 시 열기/토글
            onMouseLeave={() => setIsOpen(false)}      // 마우스가 버튼+보드 영역을 벗어나면 닫기
        >
            <strong style={{ fontSize: "14px" }}>
                {member && member.name}
            </strong>
            <span style={{ fontSize: "12px", marginTop: "2px", paddingRight: "5px" }}>
                {member && member.position}
            </span>

            {/* 💡 isOpen이 true일 때만 사원정보 보드 렌더링 */}
            {isOpen && (
                <div
                    className="boder vertical-box"
                    onClick={(e) => e.stopPropagation()} // 보드 내부 텍스트 클릭 시 버튼 토글 방지
                    style={{
                        position: "absolute",
                        left: "100%",
                        zIndex: "999",
                        top: "0",
                        color: "var(--color-ink)",
                        backgroundColor: "#fff", // 배경이 투명하면 뒤쪽 글자와 겹치므로 추가 권장
                        whiteSpace: "nowrap",    // 정보 길이에 맞춰 가로로 자연스럽게 확장
                        overflow: "hidden",
                        textAlign: "left",       // button 기본 가운데 정렬 상속 방지
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "5px",
                            backgroundColor: "var(--color-brand-dark)",
                        }}
                    />
                    <div style={{ margin: "10px 30px 20px 30px" }} className="vertical-box">
                        <div className="horizontal-box">
                            <strong style={{ fontSize: "15px" }}>
                                {member && member.name}
                            </strong>
                            <span style={{ fontSize: "12px", marginTop: "2px", paddingRight: "5px" }}>
                                {member && member.position}
                            </span>
                        </div>
                        <div className="horizontal-box">
                            부서: {member && member.department_name}
                        </div>
                        <div className="horizontal-box">
                            전화번호: {member && member.phone}
                        </div>
                        <div className="horizontal-box">
                            이메일: {member && member.email}
                        </div>
                    </div>
                </div>
            )}
        </button>
    );
}

export default EmployeeTage;