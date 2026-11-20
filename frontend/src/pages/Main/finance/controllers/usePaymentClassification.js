// 담당 화면: 지출·거래 관리
// 역할: 분류 변경 폼·비밀번호·저장 처리을 담당합니다.
import { getClassificationGroups, validatePaymentClassification, getPaymentClassificationPayload, } from "../models/financePaymentOverviewModel";
import { savePaymentClassification } from "../../../../utils/financeService";
import { useState } from "react";
import { getFinanceError } from "../utils/financeDataUtils";

// 분류 변경 입력, 저장 및 비밀번호 초기화를 담당합니다.

export default function usePaymentClassification({ data, user, setRefresh }) {
  // 화면 상태
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
    const validationError = validatePaymentClassification(user, password);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    // 연속 제출을 즉시 막고, 화면 표시는 saving 상태로 처리합니다.
    form.dataset.saving = "true";
    setSaving(true);
    setSaveError("");
    try {
      await savePaymentClassification(
        getPaymentClassificationPayload(selectedRow, classification, user, password),
      );
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
  // 화면에 전달할 상태와 동작
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
