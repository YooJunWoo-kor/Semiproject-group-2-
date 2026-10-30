import React, { useState } from "react";

function DraftCreate({ drafts, setDrafts, loginUser }) {
    const [title, setTitle] = useState("");
    const [draftType, setDraftType] = useState("일반");
    const [content, setContent] = useState("");

    const [approverStep, setApproverStep] = useState(null)

    const [firstApprover, setFirstApprover] = useState(null)
    const [secondApprover, setSecondApprover] = useState(null)

    const [showApproverModal, setShowApproverModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [tempApprover, setTempApprover] = useState(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState("");

    const [amount, setAmount] = useState("");
    const [useDate, setUseDate] = useState("");

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

    const departments = ["개발팀", "인사팀"];

    function handleSubmit(e, saveType) {
        e.preventDefault();

        if(title.trim() === ""){
            alert("임시저장하려면 제목을 입력해주세요");
            return;
        }

        if (title.trim() === "" || content.trim() === "") {
            alert("제목과 내용을 입력해주세요");
            return;
        }

        if (!firstApprover || !secondApprover) {
            alert("1차, 2차 결재자 모두 선택해주세요");
            return;
        }


        if (saveType === "submit") {
            if (!firstApprover || !secondApprover) {
                alert("1차, 2차 결재자 모두 선택해주세요");
                return;
            }
        }

        // 유효성 검사
        if (draftType === "휴가") {
            if (startDate === "" || endDate === "") {
                alert("휴가 기간을 선택해주세요.");
                return;
            }
        }

        if (draftType === "구매") {
            if (itemName.trim() === "" || quantity === "") {
                alert("물품명과 수량을 입력해주세요.");
                return;
            }
        }

        if (draftType === "비용") {
            if (useDate === "" || amount === "") {
                alert("사용일과 금액을 입력해주세요.");
                return;
            }
        }


        const draftData = {
            id: Date.now(), // 1970-01-01부터 현재까지 지난 밀리초 값 (겹칠일이 없어서 id로 씀)
            title: title,
            draftType: draftType,
            content: content,
            status: saveType === "temporary" ? "임시저장" : "1차결재대기", //
            createdAt: new Date().toLocaleDateString(), // 작성일이며 toLocaleDateString : 읽기 쉬운 문자열로 바꾸는 함수
            writerId: loginUser.id,
            writerName: loginUser.name,
            writerDepartment: loginUser.department,
            writerPosition: loginUser.position,
            firstApproverId: firstApprover.id ? firstApprover.id : null,
            firstApproverName: firstApprover.name ? firstApprover.name : "",
            firstApproverDepartment: firstApprover.department ? firstApprover.department : "",
            firstApproverPosition: firstApprover.position ? firstApprover.position : "",

            secondApproverId: secondApprover ? secondApprover.id : null,
            secondApproverName: secondApprover ? secondApprover.name : "",
            secondApproverDepartment: secondApprover ? secondApprover.department : "",
            secondApproverPosition: secondApprover ? secondApprover.position : "",

            startDate: startDate,
            endDate: endDate,
            itemName: itemName,
            quantity: quantity,
            useDate: useDate,
            amount: amount,
        };



        setDrafts([
            ...drafts,
            draftData
        ])

        setTitle("");
        setDraftType("일반");
        setContent("");
        setFirstApprover(null);
        setSecondApprover(null);

        setStartDate("");
        setEndDate("");

        setItemName("");
        setQuantity("");

        setUseDate("");
        setAmount("");
    }

    return (

        <div>
            <h2>기안서 작성</h2>
            <form>
                <div>
                    <p>작성자 : {loginUser.name}</p>
                    <p>부서 : {loginUser.department}</p>
                    <p>직책 : {loginUser.position}</p>
                </div>

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

                    {draftType === "휴가" && (
                        <div>
                            <label>
                                휴가 시작일
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </label>

                            <label>
                                휴가 종료일
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </label>
                        </div>
                    )}

                    {draftType === "구매" && (
                        <div>
                            <label>
                                물품명
                                <input
                                    type="text"
                                    value={itemName}
                                    onChange={e => setItemName(e.target.value)}
                                />
                            </label>

                            <label>
                                수량
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    {draftType === "비용" && (
                        <div>
                            <label>
                                사용일
                                <input
                                    type="date"
                                    value={useDate}
                                    onChange={e => setUseDate(e.target.value)}
                                />
                            </label>

                            <label>
                                금액
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </label>
                        </div>
                    )}
                </label>

                <label>
                    내용

                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                </label>

                <button type="button" onClick={() => {
                    setApproverStep(1);
                    setShowApproverModal(true);
                }}>
                    1차 결재자 선택
                </button>

                <button type="button" onClick={() => {
                    setApproverStep(2);
                    setShowApproverModal(true);
                }}>
                    2차 결재자 선택
                </button>


                <button type="button" onClick={ (e) => handleSubmit(e, "temporary")}>
                    임시저장
                </button>

                <button type="button" onClick={ (e) => handleSubmit(e, "submit")}>
                    결재 요청
                </button>

            </form>

            {showApproverModal && (
                <div>
                    <h3>{approverStep === 1 ? "1차 결재자 선택" : "2차 결재자 선택"}</h3>

                    <h4>부서 선택</h4>

                    {departments.map((department) => (
                        <button type="button" key={department}
                            onClick={() => {
                                setSelectedDepartment(department);
                                setTempApprover(null);
                            }}
                        >
                            {department}
                        </button>
                    ))}
                    {selectedDepartment && (
                        <div>
                            <h4>{selectedDepartment}</h4>

                            {employees.filter((employee) => {
                                return employee.department === selectedDepartment;
                            })
                                .map((employee) => (
                                    <div key={employee.id}>
                                        <label>
                                            <input type="radio" name="approver" onChange={() => setTempApprover(employee)} />

                                            {employee.name} / {employee.position}
                                        </label>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    <button type="button" onClick={() => {
                        if (!tempApprover) {
                            alert("결제자를 선택해주세요");
                            return;
                        }

                        if (approverStep === 1) {
                            setFirstApprover(tempApprover);
                        }
                        else if (approverStep === 2) {
                            setSecondApprover(tempApprover);
                        }

                        setShowApproverModal(false);
                        setSelectedDepartment("");
                        setTempApprover(null);
                        setApproverStep(null);
                    }}>
                        결재자 선택

                    </button>

                    <button type="button" onClick={() => {
                        setShowApproverModal(false);
                        setSelectedDepartment("");
                        setTempApprover(null);
                    }}>
                        취소
                    </button>

                </div>
            )}


            {firstApprover && (
                <p>
                    1차 결재자 :
                    {firstApprover.name} / {firstApprover.position}

                </p>
            )}

            {secondApprover && (
                <p>
                    2차 결재자 :
                    {secondApprover.name} / {secondApprover.position}
                </p>
            )}



        </div>
    )
}

export default DraftCreate;