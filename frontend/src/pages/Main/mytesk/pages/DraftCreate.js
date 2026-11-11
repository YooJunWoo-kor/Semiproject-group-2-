import React, { useEffect, useState } from "react";
import axios from "axios";
import ModalBase from "../../../../components/ModalBase";
import DepEmpList from "../../../../components/DepEmpList";
import { useSearchParams } from "react-router-dom";

import { API_BASE_URL, getLoginUser } from "../../../../utils/authStorage";

const emptyForm = {
    title: "", draftType: "일반", content: "",
    startDate: "", endDate: "",
    itemName: "", quantity: "",
    useDate: "", amount: ""
};

function DraftCreate({ loginUser = {}, editingDraft, setEditingDraft, onDraftChanged }) {
    const [form, setForm] = useState(emptyForm);
    const [departments, setDepartments] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [showApproverModal, setShowApproverModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [tempApprover, setTempApprover] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const { title, draftType, content, startDate, endDate, itemName, quantity, useDate, amount } = form;

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const response = await axios.get(API_BASE_URL + "/drafts/departments");
                setDepartments(response.data.map(item => item.department_name));
            } catch (error) {
                console.error("부서 조회 실패:", error);
            }
        };

        loadDepartments();
    }, []);

    useEffect(() => {
        if (!editingDraft) return;

        const detail = editingDraft.detailData || {};
        setForm({
            ...emptyForm,
            title: editingDraft.title || "",
            draftType: editingDraft.draftType || "일반",
            content: editingDraft.content || "",
            startDate: detail.startDate || "",
            endDate: detail.endDate || "",
            itemName: detail.itemName || "",
            quantity: detail.quantity ?? "",
            useDate: detail.useDate || "",
            amount: detail.amount ?? ""
        });
        setApprovers(editingDraft.approvers || []);
    }, [editingDraft]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const closeApproverModal = () => {
        setShowApproverModal(false);
        setSelectedDepartment("");
        setTempApprover(null);
    };

    const addApprover = () => {
        if (!tempApprover) {
            alert("직원을 선택해주세요.");
            return;
        }

        if (approvers.some(item => item.employee_id === tempApprover.employee_id)) {
            alert("이미 추가된 결재자입니다.");
            return;
        }

        setApprovers(prev => [...prev, tempApprover]);
        closeApproverModal();
    };

    const handleSubmit = async (saveType) => {
        if (isSaving) return;

        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }

        if (saveType === "submit") {
            if (!content.trim() || approvers.length === 0) {
                alert("내용을 입력하고 결재자를 한 명 이상 선택해주세요.");
                return;
            }
            if (draftType === "휴가" && (!startDate || !endDate || startDate > endDate)) {
                alert("올바른 휴가 기간을 선택해주세요.");
                return;
            }
            if (draftType === "구매" && (!itemName.trim() || !quantity || Number(quantity) <= 0)) {
                alert("물품명과 올바른 수량을 입력해주세요.");
                return;
            }
            if (draftType === "비용" && (!useDate || amount === "" || Number(amount) < 0)) {
                alert("사용일과 올바른 금액을 입력해주세요.");
                return;
            }
        }

        const employeeId = getLoginUser()?.employeeKey;
        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            alert("로그인 사용자 정보가 올바르지 않습니다.");
            return;
        }

        const detailData = draftType === "휴가" ? { startDate, endDate } :
            draftType === "구매" ? { itemName, quantity } :
            draftType === "비용" ? { useDate, amount } : {};

        const payload = {
            employeeId, title: title.trim(), documentType: draftType,
            content: content.trim(), detailData
        };
        const approverIds = approvers.map(item => item.employee_id);

        setIsSaving(true);

        try {
            if (editingDraft) {
                await axios.patch(API_BASE_URL + "/drafts/" + editingDraft.id, payload);

                if (saveType === "submit") {
                    await axios.post(API_BASE_URL + "/drafts/" + editingDraft.id + "/submit", {
                        employeeId, approverIds
                    });
                }
            } else if (saveType === "temporary") {
                await axios.post(API_BASE_URL + "/drafts", payload);
            } else {
                await axios.post(API_BASE_URL + "/drafts/submit", { ...payload, approverIds });
            }

            if (onDraftChanged) await onDraftChanged();
            alert(saveType === "temporary" ? "기안서 임시저장 완료" : "기안서 상신 완료");
            setForm(emptyForm);
            setApprovers([]);
            if (setEditingDraft) setEditingDraft(null);
        } catch (error) {
            console.error("기안서 저장 오류:", error);
            alert(error.response?.data?.message || "기안서 저장에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="draft-box">
            <header className="dashboard-header">
                <span className="subtitle">기안서 작성</span>
            </header>

            <form className="draft-box" onSubmit={e => e.preventDefault()}>
                <div className="draft-row">
                    <p>작성자: {loginUser.name}</p>
                    <p>부서: {loginUser.departmentName}</p>
                    <p>직책: {loginUser.position}</p>
                </div>

                <div className="draft-row">
                    <label>제목
                        <input name="title" value={title} onChange={handleInputChange} />
                    </label>
                    <label>문서 종류
                        <select name="draftType" value={draftType} onChange={handleInputChange}>
                            <option>일반</option>
                            <option>휴가</option>
                            <option>구매</option>
                            <option>비용</option>
                        </select>
                    </label>
                </div>

                {draftType === "휴가" && (
                    <div className="draft-row">
                        <label>휴가 시작일
                            <input type="date" name="startDate" value={startDate} onChange={handleInputChange} />
                        </label>
                        <label>휴가 종료일
                            <input type="date" name="endDate" value={endDate} onChange={handleInputChange} />
                        </label>
                    </div>
                )}
                {draftType === "구매" && (
                    <div className="draft-row">
                        <label>물품명
                            <input name="itemName" value={itemName} onChange={handleInputChange} />
                        </label>
                        <label>수량
                            <input type="number" min="1" step="1" name="quantity"
                                value={quantity} onChange={handleInputChange} />
                        </label>
                    </div>
                )}
                {draftType === "비용" && (
                    <div className="draft-row">
                        <label>사용일
                            <input type="date" name="useDate" value={useDate} onChange={handleInputChange} />
                        </label>
                        <label>금액
                            <input type="number" min="0" step="1" name="amount"
                                value={amount} onChange={handleInputChange} />
                        </label>
                    </div>
                )}

                <label>내용
                    <textarea name="content" value={content} onChange={handleInputChange} />
                </label>

                <div className="draft-box">
                    <div className="draft-row">
                        <h4>결재선</h4>
                        <button type="button" onClick={() => setShowApproverModal(true)}>결재자 추가</button>
                    </div>
                    {approvers.length === 0 ? (
                        <p>등록된 결재자가 없습니다.</p>
                    ) : approvers.map((approver, index) => (
                        <div key={approver.employee_id} className="draft-row">
                            <span>{index + 1}단계 결재자: {approver.position} {approver.name}</span>
                            <button type="button" onClick={() =>
                                setApprovers(prev => prev.filter(item => item.employee_id !== approver.employee_id))
                            }>삭제</button>
                        </div>
                    ))}
                </div>

                <div className="draft-actions">
                    <button type="button" disabled={isSaving}
                        onClick={() => handleSubmit("temporary")}>임시저장</button>
                    <button type="button" className="erp-primary-button" disabled={isSaving}
                        onClick={() => handleSubmit("submit")}>
                        {isSaving ? "저장 중..." : "결재 요청"}
                    </button>
                </div>
            </form>

            {showApproverModal && (
                <ModalBase title="결재자 추가" onClose={closeApproverModal}
                    layout={
                        <div className="draft-box">
                            <h4>부서 선택</h4>
                            <div className="draft-row">
                                {departments.map(department => (
                                    <button key={department} type="button"
                                        onClick={() => {
                                            setSelectedDepartment(department);
                                            setTempApprover(null);
                                        }}>
                                        {department}
                                    </button>
                                ))}
                            </div>
                            {selectedDepartment && (
                                <DepEmpList departmentName={selectedDepartment} onSelect={setTempApprover} />
                            )}
                            <div className="draft-actions">
                                <button type="button" className="erp-primary-button"
                                    onClick={addApprover}>결재자 추가</button>
                            </div>
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default DraftCreate;
