//재무 공통 기능: 선택한 계좌·카드의 이력 조회 및 이전 요청 결과 무시.
import { useEffect, useState } from 'react';
import { getFinanceError } from './financeUtils';

export default function useFinanceHistory(request, selectedId, fallbackMessage) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPayments([]);
    setError('');
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
    return () => { cancelled = true; };
  }, [request, selectedId, fallbackMessage]);

  return { payments, loading, error };
}
