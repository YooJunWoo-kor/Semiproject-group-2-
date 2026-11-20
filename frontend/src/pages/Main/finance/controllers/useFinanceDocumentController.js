// 담당 화면: 영수증·청구서·견적서
// 역할: 문서 초기 정보 조회·입력 상태·유효성 검사·저장·인쇄 연결을 담당합니다.
// Controller: 문서 상태·초기 조회·DOM 검증·저장·인쇄를 연결합니다.
import { useEffect, useState } from "react";
import { DOCUMENT_TYPES, localDate, money, calculateRows, calculateTotals, printDocument, saveFinanceDocument, getDocumentPartners, getDocumentBusiness, getDocumentAccounts, } from "../utils/financeDocumentUtils";
import { initialDocument, newItem, documentSnapshot, updateDocumentParty, updateDocumentItem, selectDocumentPartner, selectDocumentAccount, getFinanceDocumentPayload, } from "../models/financeDocumentModel";
import { validateEmail, validatePhone, validateBusinessNumber, validateLength, validateDateRange, } from "../../../../utils/validation";
import { getLoginUser } from "../../../../utils/authStorage";

function refreshValidity(form) {
  const fields = Array.from(form.querySelectorAll("input, textarea, select"));
  for (const input of fields) {
    input.setCustomValidity("");
    if (input.disabled || input.readOnly || input.tagName === "SELECT") continue;
    const label = input.dataset.label || "입력값";
    const textField = input.tagName === "TEXTAREA" || ["text", "email", "tel"].includes(input.type);
    if (
      textField &&
      !validateLength(input.value, {
        required: input.required,
        max: input.maxLength >= 0 ? input.maxLength : Infinity,
      })
    ) {
      input.setCustomValidity(`${label}의 필수 입력 여부와 글자 수를 확인해주세요.`);
      continue;
    }
    const validators = {
      email: validateEmail,
      phone: validatePhone,
      businessNumber: validateBusinessNumber,
    };
    const validator = validators[input.dataset.validation];
    if (
      validator &&
      !validator(input.value, {
        required: input.required,
      })
    )
      input.setCustomValidity(`${label} 형식을 확인해주세요.`);
  }
  const start = form.querySelector('[data-date-role="start"]');
  const end = form.querySelector('[data-date-role="end"]');
  if (
    start &&
    end &&
    !validateDateRange(start.value, end.value, {
      required: true,
    })
  ) {
    let target = end;
    if (!start.value) target = start;
    target.setCustomValidity(
      `${start.dataset.label}과 ${end.dataset.label}의 입력값과 날짜 순서를 확인해주세요.`,
    );
  }
}

export default function useFinanceDocumentController({
  type = "receipt",
  onClose,
  storedDocument = null,
  onBusyChange,
}) {
  const config = DOCUMENT_TYPES[type] || DOCUMENT_TYPES.receipt;
  // 화면 상태
  const [savedDocument, setSavedDocument] = useState(storedDocument);
  const [data, setData] = useState(() => {
    if (storedDocument) return documentSnapshot(storedDocument);
    else return initialDocument(DOCUMENT_TYPES[type] ? type : "receipt");
  });
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [partners, setPartners] = useState([]);
  const [partnerError, setPartnerError] = useState("");
  const readOnly = Boolean(savedDocument);
  const [accounts, setAccounts] = useState([]);
  const [setupError, setSetupError] = useState("");
  const [businessReady, setBusinessReady] = useState(false);
  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    getDocumentBusiness(controller.signal)
      .then((business) => {
        if (controller.signal.aborted) return;
        setData((old) => ({
          ...old,
          business,
        }));
        setBusinessReady(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setSetupError(error.message);
      });
    if (type === "invoice")
      getDocumentAccounts(controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setAccounts(value);
        })
        .catch((error) => {
          if (error.name !== "AbortError") setSetupError(error.message);
        });
    return () => controller.abort();
  }, [readOnly, type]);
  const [lifecycle, setLifecycle] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLifecycle(controller);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    getDocumentPartners(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          if (!Array.isArray(value)) throw new Error("거래처 목록 형식을 확인해주세요.");
          setPartners(value);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setPartnerError("거래처 목록을 불러오지 못했습니다. 고객 정보 직접 입력은 가능합니다.");
      });
    return () => controller.abort();
  }, [readOnly]);
  const [formElement, setFormElement] = useState(null);
  const [previewElement, setPreviewElement] = useState(null);
  const rows = calculateRows(data.items, data.currency);
  const totals = calculateTotals(rows, data.currency);
  const format = (value) => money(value, data.currency);
  const update = (key, value) =>
    setData((old) => ({
      ...old,
      [key]: value,
    }));
  const updateParty = (key) => (field, value) =>
    setData((old) => updateDocumentParty(old, key, field, value));
  const updateItem = (id, key, value) => setData((old) => updateDocumentItem(old, id, key, value));
  function addItem() {
    update("items", [...data.items, newItem()]);
  }
  function selectAccount(event) {
    const id = event.target.value;
    setData((old) => selectDocumentAccount(old, id, accounts));
  }
  const loginUser = getLoginUser();
  // 공통 로그인 정보는 employeeKey를 사용합니다. 기존 employee_id도 지원합니다.
  const employeeId = loginUser?.employee_id ?? loginUser?.employeeKey;
  const employeeName =
    savedDocument?.snapshot_json?.author?.name || loginUser?.name || "담당자 미정";
  const [openedDate] = useState(() => localDate());
  const nowDate = savedDocument?.snapshot_json?.createdDate || openedDate;
  async function handleSave() {
    if (saving || savedDocument || !lifecycle || lifecycle.signal.aborted) return;
    setStorageError("");
    if (!formElement) return;
    if (!businessReady) {
      setStorageError("회사 기본정보를 불러온 뒤 저장해주세요.");
      return;
    }
    refreshValidity(formElement);
    if (!formElement.reportValidity()) return;
    if (!employeeId) {
      setStorageError("로그인한 사원 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }
    setSaving(true);
    setStorageError("");
    onBusyChange?.(true);
    try {
      const result = await saveFinanceDocument(getFinanceDocumentPayload(type, employeeId, data));
      if (lifecycle && !lifecycle.signal.aborted) {
        setData(documentSnapshot(result.document));
        setSavedDocument(result.document);
      }
    } catch (error) {
      if (lifecycle && !lifecycle.signal.aborted)
        setStorageError(
          `${error.message} 응답을 받지 못한 경우 재시도 전에 저장 문서 목록에서 저장 여부를 확인해주세요.`,
        );
    } finally {
      if (lifecycle && !lifecycle.signal.aborted) setSaving(false);
      onBusyChange?.(false);
    }
  }
  function handlePrint() {
    if (!savedDocument || saving) return;
    try {
      printDocument(previewElement, `${config.title}_${savedDocument.document_number}`);
    } catch (error) {
      setStorageError(error.message || "인쇄 창을 열지 못했습니다. 브라우저 설정을 확인해주세요.");
    }
  }
  function selectPartner(event) {
    setStorageError("");
    const id = event.target.value;
    setData((old) => selectDocumentPartner(old, id, partners));
  }
  // 화면에 전달할 상태와 동작
  return {
    config,
    savedDocument,
    data,
    saving,
    storageError,
    partners,
    partnerError,
    readOnly,
    accounts,
    setupError,
    rows,
    totals,
    format,
    update,
    updateParty,
    updateItem,
    employeeName,
    nowDate,
    setFormElement,
    setPreviewElement,
    setStorageError,
    refreshValidity,
    handleSave,
    handlePrint,
    selectPartner,
    selectAccount,
    addItem,
  };
}
