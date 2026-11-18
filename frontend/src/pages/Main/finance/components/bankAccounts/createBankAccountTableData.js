import React from "react";
import { FinanceStatusBadge } from "../FinanceDetailUI";
import { getBankAccountStatusLabel, getBankAccountStatusTone } from "./bankAccountModel";

export default function createBankAccountTableData({
  accountStatusSaving,
  filteredAccounts,
  openAccountDetail,
  openAccountHistory,
  openEditAccountForm,
  saving,
}) {
  // 목록 수정은 이 배열에서만 합니다.
  // width: 열 너비 / label: 제목 / field: 표시할 계좌 데이터 / render: 버튼·배지 등 별도 표시
  // 항목을 이동하거나 삭제하면 제목과 내용이 함께 변경됩니다.
  const accountColumns = [
    {
      key: "id",
      label: "ID",
      field: "id",
    },
    {
      key: "bank",
      label: "은행명",
      render: (acc) => <strong>{acc.bankName}</strong>,
    },
    {
      key: "number",
      label: "계좌번호",
      field: "accountNumber",
    },
    {
      key: "manager",
      label: "관리자",
      field: "managerName",
    },
    {
      key: "name",
      label: "계좌명",
      render: (acc) => <span title={acc.accountName}>{acc.accountName}</span>,
    },
    {
      key: "status",
      width: "80px",
      label: "상태",
      render: (acc) => (
        <FinanceStatusBadge tone={getBankAccountStatusTone(acc.status)}>
          {getBankAccountStatusLabel(acc.status)}
        </FinanceStatusBadge>
      ),
    },
    {
      key: "actions",
      width: "180px",
      label: "관리",
      render: (acc) => (
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
          }}
        >
          <button
            type="button"
            disabled={saving || accountStatusSaving}
            onClick={() => openAccountDetail(acc.id)}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 8px",
            }}
          >
            상세
          </button>
          <button
            type="button"
            disabled={saving || accountStatusSaving}
            onClick={() => openAccountHistory(acc.id)}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 8px",
            }}
          >
            거래내역
          </button>
          <button
            type="button"
            disabled={saving || accountStatusSaving}
            onClick={() => openEditAccountForm(acc)}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 8px",
            }}
          >
            수정
          </button>
        </div>
      ),
    },
  ];

  // 제목과 셀을 같은 설정으로 생성하므로 순서가 어긋나지 않습니다.
  const accountHeaders = accountColumns.map((column) => column.label);
  const tAccountData = filteredAccounts.map((acc) => ({
    content: accountColumns.map((column) => (
      <React.Fragment key={column.key}>
        {column.render ? column.render(acc) : (acc[column.field] ?? "-")}
      </React.Fragment>
    )),
  }));

  // BasicTable은 thead 없이 첫 tr에 제목을 표시합니다.
  // 공통 파일 대신 이 목록의 DOM에만 인라인 너비·여백을 적용합니다.
  return {
    accountColumns,
    accountHeaders,
    tAccountData,
  };
}
