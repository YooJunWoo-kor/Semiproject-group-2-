// 분류 변경 입력, 저장 및 비밀번호 초기화를 담당합니다.
import { getClassificationGroups } from "./paymentManagementModel";
import { savePaymentClassification } from "../../../../../utils/financeService";
import { useState } from "react";
import { getFinanceError } from "../financeUtils";

export default function usePaymentClassification({ data, user, setRefresh }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [classification, setClassification] = useState("unclassified");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const classificationGroups = getClassificationGroups(data, selectedRow);
  function openDetail(row) {
    setSelectedRow(row);
    setClassification(row.category_code);
    setPassword("");
    setSaveError("");
  }
  function closeDetail() {
    if (saving) return;
    setSelectedRow(null);
    setPassword("");
  }
  async function handleClassification(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (saving || form.dataset.saving === "true" || !selectedRow) return;
    const employeeId = Number(user?.employee_id ?? user?.employeeKey);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      setSaveError("로그인 사원정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }
    if (!password) {
      setSaveError("로그인 비밀번호를 입력해 주세요.");
      return;
    }
    // 연속 제출을 즉시 막고, 화면 표시는 saving 상태로 처리합니다.
    form.dataset.saving = "true";
    setSaving(true);
    setSaveError("");
    try {
      await savePaymentClassification({
        source_type: selectedRow.source_type,
        source_id: selectedRow.source_id,
        category_code: classification,
        employee_id: employeeId,
        password,
      });
      setSelectedRow(null);
      setRefresh((value) => value + 1);
    } catch (err) {
      setSaveError(getFinanceError(err, "분류를 저장하지 못했습니다."));
    } finally {
      setPassword("");
      delete form.dataset.saving;
      setSaving(false);
    }
  }
  return {
    selectedRow,
    classification,
    setClassification,
    password,
    setPassword,
    saving,
    saveError,
    classificationGroups,
    openDetail,
    closeDetail,
    handleClassification,
  };
}
