//거래처 금액 조회와 조회 월·전체 기간 상태를 담당합니다.
import { getFinanceError } from "../financeUtils";
import { useState } from "react";
import { getPartnerBalanceDetails } from "../../../../../utils/financeService";
import { currentPartnerMonth, filterPartnerMonth } from "./partnerModel";

function getBalanceError(error) {
  if (error.response?.status === 404) {
    return "금액 상세 API를 찾지 못했습니다. financeRouters.js 교체 후 백엔드를 재시작해 주세요.";
  }
  let message = "백엔드에 연결하지 못했습니다. 서버 실행 상태를 확인해 주세요.";
  if (error.response) {
    message = `금액 상세 조회에 실패했습니다. (HTTP ${error.response.status})`;
  }
  return getFinanceError(error, message);
}

export default function usePartnerBalances() {
  const [amountDetail, setAmountDetail] = useState(null);
  const [amountMonth, setAmountMonth] = useState(currentPartnerMonth);
  const [allAmountPeriods, setAllAmountPeriods] = useState(false);
  const amountRows = filterPartnerMonth(amountDetail?.rows || [], amountMonth, allAmountPeriods);

  async function openAmountDetail(partner, type) {
    setAmountMonth(currentPartnerMonth());
    setAllAmountPeriods(false);
    const request = { partner, type, loading: true, rows: [], error: "" };
    setAmountDetail(request);
    try {
      const rows = await getPartnerBalanceDetails(partner.id, type);
      setAmountDetail((current) => {
        if (current !== request) return current;
        return { ...request, loading: false, rows };
      });
    } catch (error) {
      setAmountDetail((current) => {
        if (current !== request) return current;
        return { ...request, loading: false, error: getBalanceError(error) };
      });
    }
  }

  return {
    amountDetail,
    setAmountDetail,
    amountMonth,
    setAmountMonth,
    allAmountPeriods,
    setAllAmountPeriods,
    amountRows,
    openAmountDetail,
  };
}
