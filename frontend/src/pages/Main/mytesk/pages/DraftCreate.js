import React, { useEffect, useState } from "react";
import ModalBase from "../../../../components/ModalBase";
import axios from "axios";
import { getLoginUser, getDbEmployeeAccounts as getEmployeeAccounts } from "../../../../utils/authStorage";
import DepEmpList from "../../../../components/DepEmpList";


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api"

function DraftCreate({
    loginUser,
    editingDraft,
    setEditingDraft,
    onDraftChanged
}) {

    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [departments, setDepartments ] = useState([]); 


    const [title, setTitle] = useState("");
    const [draftType, setDraftType] = useState("일반");
    const [content, setContent] = useState("");

    const [approvers, setApprovers] = useState([]);

    const [showApproverModal, setShowApproverModal] = useState(false);
    const [tempApprover, setTempApprover] = useState(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState("");

    const [amount, setAmount] = useState("");
    const [useDate, setUseDate] = useState("");


    // 임시저장 문서를 이어서 작성할 때 기존 데이터 불러오기
    useEffect(() => {
        async function loadDepartments() {
            try {
                const employees = await getEmployeeAccounts();
    
                const departmentList = [
                    ...new Set(
                        employees.map(employee => employee.department_name).filter(Boolean)
                    )
                ];
    
                setDepartments(departmentList);
    
            } catch (error) {
                console.error("부서 조회 실패:", error);
            }
        }
    
        loadDepartments();
    }, []);

    useEffect(() => {
        if (editingDraft) {
            setTitle(editingDraft.title || "");
            setDraftType(editingDraft.draftType || "일반");
            setContent(editingDraft.content || "");
            setApprovers(editingDraft.approvers || []);
    
            setStartDate(editingDraft.startDate || "");
            setEndDate(editingDraft.endDate || "");
    
            setItemName(editingDraft.itemName || "");
            setQuantity(editingDraft.quantity || "");
    
            setUseDate(editingDraft.useDate || "");
            setAmount(editingDraft.amount || "");
        }
    }, [editingDraft]);




    async function handleSubmit(e, saveType) {

        e.preventDefault();


        // 임시저장 유효성 검사
        if (saveType === "temporary") {

            if (title.trim() === "") {
                alert("임시저장하려면 제목을 입력해주세요");
                return;
            }
        }


        // 결재요청 유효성 검사
        if (saveType === "submit") {

            if (title.trim() === "" || content.trim() === "") {
                alert("제목과 내용을 입력해주세요");
                return;
            }

            if (approvers.length === 0) {
                alert("결재자를 한 명 이상 추가해주세요");
                return;
            }


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
        }

        const employeeId = getLoginUser()?.employeeKey;
        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            alert("로그인 사용자 정보가 올바르지 않습니다.");
            return;
        }

        const payload = {
            employeeId,
            title,
            documentType: draftType,
            content
        };

        try {
            if (editingDraft) {
                // 기존 임시저장 문서의 수정 내용을 먼저 DB에 반영한다.
                await axios.patch(`${API_BASE_URL}/drafts/${editingDraft.id}`, payload);
                if (saveType === "submit") {
                    const approverIds = approvers.map(approver => approver.employee_id);
                    await axios.post(`${API_BASE_URL}/drafts/${editingDraft.id}/submit`, {
                        employeeId,
                        approverIds
                    });
                }
            } else if (saveType === "temporary") {
                await axios.post(`${API_BASE_URL}/drafts`, payload);
            } else {
                const approverIds = approvers.map(approver => approver.employee_id);
                await axios.post(`${API_BASE_URL}/drafts/submit`, {
                    ...payload,
                    approverIds
                });
            }
            await onDraftChanged();
            alert(saveType === "temporary" ? "기안서 임시저장 완료" : "기안서 상신 완료");
        } catch (error) {
            console.error("기안서 DB 저장 오류:", error);
            alert(error.response?.data?.message ||
                (saveType === "temporary" ? "기안서 임시저장 실패" : "기안서 상신 실패"));
            return;
        }

        // 입력값 초기화
        setTitle("");
        setDraftType("일반");
        setContent("");

        setApprovers([]);

        setStartDate("");
        setEndDate("");

        setItemName("");
        setQuantity("");

        setUseDate("");
        setAmount("");

        setEditingDraft(null);
    }


    return (

        <div className="draft-box">

            <h2>기안서 작성</h2>


            <form className="draft-box">


                {/* 작성자 정보 */}
                <div className="draft-row">

                    <p>작성자 : {loginUser.name}</p>

                    <p>부서 : {loginUser.department_id}</p>

                    <p>직책 : {loginUser.position}</p>

                </div>


                {/* 제목 */}
                <label>
                    제목

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </label>


                {/* 문서 종류 */}
                <label>
                    문서 종류

                    <select
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value)}
                    >
                        <option>일반</option>
                        <option>휴가</option>
                        <option>구매</option>
                        <option>비용</option>
                    </select>
                </label>


                {/* 휴가 */}
                {draftType === "휴가" && (

                    <div className="draft-row">

                        <label>
                            휴가 시작일

                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </label>


                        <label>
                            휴가 종료일

                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </label>

                    </div>
                )}


                {/* 구매 */}
                {draftType === "구매" && (

                    <div className="draft-row">

                        <label>
                            물품명

                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                            />
                        </label>


                        <label>
                            수량

                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </label>

                    </div>
                )}


                {/* 비용 */}
                {draftType === "비용" && (

                    <div className="draft-row">

                        <label>
                            사용일

                            <input
                                type="date"
                                value={useDate}
                                onChange={(e) => setUseDate(e.target.value)}
                            />
                        </label>


                        <label>
                            금액

                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </label>

                    </div>
                )}


                {/* 내용 */}
                <label>
                    내용

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </label>


                {/* 결재선 */}
                <div className="draft-box">

                    <div className="draft-row">

                        <h4>결재선</h4>

                        <button
                            type="button"
                            onClick={() => {
                                setShowApproverModal(true);
                            }}
                        >
                            결재자 추가
                        </button>

                    </div>


                    {approvers.length === 0 ? (

                        <p>등록된 결재자가 없습니다.</p>

                    ) : (

                        approvers.map((approver, index) => (

                            <div
                                key={approver.employee_id}
                                className="draft-row"
                            >

                                <span>
                                    {index + 1}단계 결재자 :
                                    {" "}
                                    {approver.position} {approver.name}
                                </span>


                                <button
                                    type="button"
                                    onClick={() => {

                                        setApprovers(

                                            approvers.filter((item) => {
                                                return (
                                                    item.employee_id !==
                                                    approver.employee_id
                                                );
                                            })

                                        );
                                    }}
                                >
                                    삭제
                                </button>

                            </div>
                        ))
                    )}

                </div>


                {/* 저장 버튼 */}
                <div className="draft-actions">

                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, "temporary")}
                    >
                        임시저장
                    </button>


                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, "submit")}
                    >
                        결재 요청
                    </button>

                </div>

            </form>


            {/* 결재자 선택 */}
            {showApproverModal && (
    <ModalBase
        title="결재자 추가"
        onClose={() => {
            setShowApproverModal(false);
            setTempApprover(null);
            setSelectedDepartment("");
        }}
        layout={
            <div className="draft-box">
                <h4>부서 선택</h4>

                <div className="draft-row">
                    {departments.map(department => (
                        <button
                            type="button"
                            key={department}
                            onClick={() => {
                                setSelectedDepartment(department);
                                setTempApprover(null);
                            }}
                        >
                            {department}
                        </button>
                    ))}
                </div>

                {selectedDepartment && (
                    <DepEmpList
                        departmentName={selectedDepartment}
                        onSelect={setTempApprover}
                    />
                )}

                <div className="draft-actions">
                    <button
                        type="button"
                        onClick={() => {
                            if (!tempApprover) {
                                alert("직원을 선택해주세요.");
                                return;
                            }

                            if (approvers.some(
                                item =>
                                    item.employee_id ===
                                    tempApprover.employee_id
                            )) {
                                alert("이미 추가된 결재자입니다.");
                                return;
                            }

                            setApprovers(prev => [
                                ...prev,
                                tempApprover
                            ]);

                            setShowApproverModal(false);
                            setSelectedDepartment("");
                            setTempApprover(null);
                        }}
                    >
                        결재자 추가
                    </button>
                </div>
            </div>
        }
    />
)}
</div>
    );
}



export default DraftCreate;