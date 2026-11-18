//거래·결재·급여 목록과 공통 회사계좌를 조회합니다.
import { getFinanceError } from "../financeUtils";
import { useEffect, useState } from "react";
import { getItems, getApprovals, getBankAccounts } from "../../../../../utils/financeService";
import { API_BASE_URL } from "../../../../../utils/authStorage";
import { buildItemList, toStoredItem } from "./itemListModel";

export default function useItemData({ payrollRefresh, scope }) {
  // DB에서 가져온 거래 품목 목록
  const [storedItemList, setItemList] = useState([]);
  const [approvedDocuments, setApprovedDocuments] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [approvalsError, setApprovalsError] = useState("");
  const [additionalPayrolls, setAdditionalPayrolls] = useState([]);
  const [additionalError, setAdditionalError] = useState("");
  const [payrollSummaries, setPayrollSummaries] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 입출금·급여·공제액 화면에서 함께 사용하는 회사계좌 목록
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();

        // DB 컬럼명을 현재 화면에서 사용하는 이름으로 변환합니다.
        const items = data.map(toStoredItem);
        setItemList(items);
      } catch (err) {
        console.error("거래 품목 조회 오류:", err);
        setError("거래 품목 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setAdditionalError("");
    fetch(`${API_BASE_URL}/finance/additional-payrolls`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const rows = await response.json();
        if (!response.ok || !Array.isArray(rows))
          throw new Error(rows.message || "추가급여를 불러오지 못했습니다.");
        if (!controller.signal.aborted) setAdditionalPayrolls(rows);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setAdditionalError(error.message);
      });
    return () => controller.abort();
  }, [payrollRefresh, scope?.refresh]);
  // 인사에서 승인(확정)한 월 급여를 조회합니다.
  useEffect(() => {
    const controller = new AbortController();
    async function loadPayrollSummaries() {
      try {
        const response = await fetch(`${API_BASE_URL}/finance/payrolls/summary`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("월 급여 합계를 불러오지 못했습니다.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("월 급여 조회 응답을 확인해 주세요.");
        if (!controller.signal.aborted) setPayrollSummaries(data);
      } catch (err) {
        if (!controller.signal.aborted) setPayrollError(err.message || "월 급여 조회 오류");
      } finally {
        if (!controller.signal.aborted) setPayrollLoading(false);
      }
    }
    loadPayrollSummaries();
    return () => controller.abort();
  }, [payrollRefresh, scope?.refresh]);

  // 기존 결재 목록 API를 조회합니다. 실제 거래/품목 테이블에는 복사하지 않습니다.
  useEffect(() => {
    let cancelled = false;
    async function loadApprovedDocuments() {
      setApprovalsLoading(true);
      setApprovalsError("");
      try {
        const data = await getApprovals();
        if (!Array.isArray(data)) throw new Error("잘못된 결재 목록 응답");
        if (!cancelled) setApprovedDocuments(data);
      } catch (err) {
        if (!cancelled) setApprovalsError(getFinanceError(err, "결재·기안서 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setApprovalsLoading(false);
      }
    }
    loadApprovedDocuments();
    return () => {
      cancelled = true;
    };
  }, [scope?.refresh]);
  // 사용 가능한 원화 회사계좌 조회
  useEffect(() => {
    async function loadPaymentAccounts() {
      try {
        const data = await getBankAccounts();
        setPaymentAccounts(
          data.filter(
            (account) => account.currency === "KRW" && ["사용", "ACTIVE"].includes(account.account_status),
          ),
        );
      } catch (err) {
        console.error("정산용 회사계좌 조회 오류:", err);
        setAccountsError("회사계좌 목록을 불러오지 못했습니다.");
      } finally {
        setAccountsLoading(false);
      }
    }
    loadPaymentAccounts();
  }, [payrollRefresh]);

  async function refreshApprovalAttachments() {
    setApprovedDocuments(await getApprovals());
  }
  const itemList = buildItemList({
    storedItemList,
    approvedDocuments,
    payrollSummaries,
    additionalPayrolls,
    scope,
  });
  return {
    storedItemList,
    setItemList,
    approvedDocuments,
    setApprovedDocuments,
    approvalsLoading,
    approvalsError,
    setApprovalsError,
    additionalError,
    payrollLoading,
    payrollError,
    loading,
    error,
    paymentAccounts,
    accountsLoading,
    accountsError,
    refreshApprovalAttachments,
    itemList,
  };
}
