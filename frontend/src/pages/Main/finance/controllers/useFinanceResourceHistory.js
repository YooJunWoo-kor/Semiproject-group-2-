// 담당 화면: 여러 재무 화면
// 역할: 선택한 카드/계좌의 거래 이력 조회를 공통 처리. 실제 export 이름은 useFinanceHistory.
import { useState, useEffect } from "react";
import { getFinanceError } from "../utils/financeDataUtils";

//재무 공통 기능: 선택한 계좌·카드의 이력 조회 및 이전 요청 결과 무시.

export function useFinanceHistory(request, selectedId, fallbackMessage) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setPayments([]);
    setError("");
    if (selectedId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const data = await request(selectedId);
        if (!cancelled) setPayments(data);
      } catch (err) {
        if (!cancelled) setError(getFinanceError(err, fallbackMessage));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [request, selectedId, fallbackMessage]);
  return {
    payments,
    loading,
    error,
  };
}
