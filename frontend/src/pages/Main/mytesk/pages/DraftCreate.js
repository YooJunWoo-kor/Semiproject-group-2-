import React, { useState } from "react";

function DraftCreate({ drafts, setDrafts, loginUser }) {
    const [title, setTitle] = useState("");
    const [draftType, setDraftType] = useState("일반");
    const [content, setContent] = useState("");
    const [selectedApprover, setSelectedApprover] = useState(null);
    const [showApproverModal, setShowApproverModal] = useState(false);

    const employees = [
        {
            id: 201,
            name: "김철수",
            department: "개발팀",
            position: "팀장"
        },
        {
            id: 202,
            name: "이영희",
            department: "개발팀",
            position: "본부장"
        },
        {
            id: 203,
            name: "박민수",
            department: "인사팀",
            position: "팀장"
        }
    ]

    function handleSubmit(e) {
        e.preventDefault();

        if(title.trim() === "" || content.trim() === "") {
            alert("제목과 내용을 입력해주세요");
            return;
        }

        if(!selectedApprover) {
            alert("결재자를 선택해주세요");
            return;
        }


        const draftData = {
            id: Date.now(), // 1970-01-01부터 현재까지 지난 밀리초 값 (겹칠일이 없어서 id로 씀)
            title: title,
            draftType: draftType,
            content: content,
            status: "요청", //
            createdAt: new Date().toLocaleDateString(), // 작성일이며 toLocaleDateString : 읽기 쉬운 문자열로 바꾸는 함수
            writerId: loginUser.id,
            writerName : loginUser.name,
            approverId: selectedApprover.id,
            approverName : selectedApprover.name,
            approverDepartment: selectedApprover.department,
            approverPosition : selectedApprover.position,
        };

        

        setDrafts([
            ...drafts,
            draftData
        ])

        setTitle("");
        setDraftType("일반");
        setContent("");
    }

    return (

        <div>
            <h2>기안서 작성</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    제목
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                </label>

                <label>
                    문서 종류

                    <select value={draftType} onChange={e => setDraftType(e.target.value)}>
                        <option>일반</option>
                        <option>휴가</option>
                        <option>구매</option>
                        <option>비용</option>
                    </select>
                </label>

                <label>
                    내용

                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                </label>

                <button type="button" onClick={() => setShowApproverModal(true)}>
                    결재자 선택
                </button>


                <button type="submit">
                    기안서 등록
                </button>

            </form>

            {showApproverModal && (
                <div>
                    <h3>결재자 선택</h3>

                    {employees.map((employee) => (
                        <div key={employee.id}>
                            <span>
                                {employee.department} /
                                {employee.position} /
                                {employee.name}
                            </span>

                            <button type="button" onClick={() => {
                                setSelectedApprover(employee);
                                setShowApproverModal(false);
                            }}>
                                선택

                            </button>
                        </div>
                    ))}
                    </div>
            )}

            {selectedApprover && (
                <p>
                    결재자 :
                    {selectedApprover.name} / {selectedApprover.position}
                </p>
            )}
            
        </div>
    )
}

export default DraftCreate;