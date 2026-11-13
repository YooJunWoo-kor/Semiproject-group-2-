import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLoginUser } from '../../../../utils/authStorage';
import PaymentManagement from './PaymentManagement';
import Approval from './Approval';
import '../components/Finance.css';
import "../../../../css/Form.css";
import "../../../../css/Table.css";
import "../../../../css/SubMain.css";
import "../../../../css/ModalPopup.css";
import "../../../../css/GroupBord.css";
export default function FinanceWorkspace() {
  const user = getLoginUser();
  const permitted = user?.role === 'MASTER' || Number(user?.department_id) === 1;
  const [params, setParams] = useSearchParams();
  const legacy = params.get('view') === 'legacy';
  const [busy, setBusy] = useState(false);
  const [legacyOptions, setLegacyOptions] = useState({});
  function changeView(view) {
    const updated = new URLSearchParams(params);
    updated.set('view', view);
    setParams(updated, {
      replace: true
    });
  }
  if (!permitted) return <div className="border-container"><h2 className="subtitle">지출·거래 관리</h2><p role="alert">재무부 또는 MASTER 계정만 이용할 수 있습니다.</p></div>;
  return <div className="border-container finance-workspace">
    <section className="finance-workspace-panel" aria-label="지출·거래 관리" hidden={legacy}>
      <PaymentManagement embedded onOpenApprovals={options => {
        setLegacyOptions(options || {});
        changeView('legacy');
      }} />
    </section>
    {legacy && <section className="finance-workspace-panel" aria-label="기존 결재·이력">
      <button type="button" disabled={busy} onClick={() => changeView('analysis')}>← 지출·거래 관리로 돌아가기</button>
      <Approval embedded allowCreate={false} initialDocumentId={legacyOptions.documentId ?? null} expenseGroups={legacyOptions.expenseGroups || []} onBusyChange={setBusy} />
    </section>}
  </div>;
}
