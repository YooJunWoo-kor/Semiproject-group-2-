// 담당 화면: 결재·이력 / 승인 지급
// 역할: 첨부파일 표시/업로드와 승인 문서 지급 등록 UI. 하나의 기본 export만 있는 파일이 아니므로 개별 export도 확인
import { FinanceButton } from "../ui/FinanceButton";
import { FinanceControl, FinanceField, FinanceActions } from "../ui/FinanceFormControls";
import useFinanceAttachmentsController from "../../controllers/useFinanceAttachmentsController";
import { formatApprovalAttachmentSize } from "../../models/financeApprovalModel";
import useApprovalPaymentsController from "../../controllers/useApprovalPaymentsController";
import React from "react";
import ModalBase from "../../../../../components/ModalBase";
import "../../styles/Finance.css";
import "../../../../../css/Form.css";
import "../../../../../css/Table.css";
import "../../../../../css/SubMain.css";
import "../../../../../css/ModalPopup.css";

//승인된 결재 문서의 지급 현황·내역과 지급 등록 폼
export function ApprovalPayments({
  approval,
  loginUser,
  blocked,
  onBusyChange,
  onPaid,
  embedded = false,
  paymentFormOpen = false,
  onFormOpenChange,
}) {
  const {
    formOpen,
    saving,
    formError,
    form,
    optionsLoading,
    bankError,
    cardError,
    availableBanks,
    availableCards,
    remaining,
    canPay,
    validSummary,
    isFinance,
    loading,
    error,
    summary,
    message,
    payments,
    setRefresh,
    openForm,
    closeForm,
    changeForm,
    submitPayment,
  } = useApprovalPaymentsController({
    approval,
    loginUser,
    blocked,
    onBusyChange,
    onPaid,
    embedded,
    paymentFormOpen,
    onFormOpenChange,
  });
  const paymentForm = (
    <form onSubmit={submitPayment}>
      <fieldset disabled={saving || blocked}>
        <p>
          {approval.title} / 남은 지급액:{" "}
          {Number.isSafeInteger(remaining) ? remaining.toLocaleString() : "조회 중"}원
        </p>
        <FinanceField label={<>지급일 *</>} htmlFor="doc-payment-date">
          <FinanceControl
            id="doc-payment-date"
            name="payment_date"
            type="date"
            required
            value={form.payment_date}
            onChange={changeForm}
          />
        </FinanceField>
        <FinanceField label={<>지급 금액 *</>} htmlFor="doc-payment-amount">
          <FinanceControl
            id="doc-payment-amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            max={Number.isSafeInteger(remaining) ? remaining : undefined}
            required
            value={form.amount}
            onChange={changeForm}
          />
        </FinanceField>
        <FinanceField label={<>결제수단 *</>} htmlFor="doc-payment-method">
          <FinanceControl
            id="doc-payment-method"
            name="payment_method"
            value={form.payment_method}
            onChange={changeForm}
            as="select"
          >
            <option value="계좌이체">계좌이체</option>
            <option value="법인카드">법인카드</option>
            <option value="현금">현금</option>
          </FinanceControl>
        </FinanceField>
        {form.payment_method === "계좌이체" && (
          <FinanceField label={<>회사계좌 *</>} htmlFor="doc-payment-account">
            <FinanceControl
              id="doc-payment-account"
              name="account_id"
              required
              value={form.account_id}
              disabled={optionsLoading || Boolean(bankError)}
              onChange={changeForm}
              as="select"
            >
              <option value="">회사계좌 선택</option>
              {availableBanks.map((bank) => (
                <option key={bank.account_id} value={bank.account_id}>
                  {bank.bank_name} / {bank.account_name} / 잔액{" "}
                  {Number(bank.balance).toLocaleString()}원
                </option>
              ))}
            </FinanceControl>
            {bankError && <p role="alert">{bankError}</p>}
          </FinanceField>
        )}
        {form.payment_method === "법인카드" && (
          <FinanceField label={<>법인카드 *</>} htmlFor="doc-payment-card">
            <FinanceControl
              id="doc-payment-card"
              name="card_id"
              required
              value={form.card_id}
              disabled={optionsLoading || Boolean(cardError)}
              onChange={changeForm}
              as="select"
            >
              <option value="">법인카드 선택</option>
              {availableCards.map((card) => (
                <option key={card.card_id} value={card.card_id}>
                  {card.card_name} / 잔여 한도 {Number(card.remaining_limit).toLocaleString()}원
                </option>
              ))}
            </FinanceControl>
            <p>법인카드는 현재 월의 지급일만 등록할 수 있습니다.</p>
            {cardError && <p role="alert">{cardError}</p>}
          </FinanceField>
        )}
        {optionsLoading && <p>계좌와 카드 목록을 불러오는 중입니다.</p>}
        <FinanceField label={<>지급 등록자 로그인 비밀번호 *</>} htmlFor="doc-payment-password">
          <FinanceControl
            id="doc-payment-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={changeForm}
          />
        </FinanceField>
        <p>ERP에 지급 내역을 기록합니다. 실제 은행 이체나 카드 결제를 실행하지 않습니다.</p>
        {formError && <p role="alert">{formError}</p>}
        <FinanceActions>
          <FinanceButton
            type="submit"
            disabled={
              !canPay ||
              (form.payment_method !== "현금" && optionsLoading) ||
              (form.payment_method === "계좌이체" && Boolean(bankError)) ||
              (form.payment_method === "법인카드" && Boolean(cardError))
            }
            variant="primary"
          >
            {saving ? "지급 저장 중..." : "지급 저장"}
          </FinanceButton>
          <FinanceButton type="button" onClick={closeForm}>
            취소
          </FinanceButton>
        </FinanceActions>
      </fieldset>
    </form>
  );
  return (
    <section className="finance-registration-modal" aria-label="지급 현황">
      {(!embedded || !formOpen) && (
        <>
          <h3>지급 현황</h3>
          <FinanceButton
            type="button"
            disabled={loading || saving || blocked}
            onClick={() => setRefresh((previous) => previous + 1)}
          >
            지급 현황 새로고침
          </FinanceButton>
          {message && <p role="status">{message}</p>}
          {loading ? (
            <p>지급 현황을 불러오는 중입니다.</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <p>
                문서 금액: {Number(summary?.document_amount || 0).toLocaleString()}원{" | "}지급
                완료: {Number(summary?.paid_amount || 0).toLocaleString()}원{" | "}남은 지급액:{" "}
                {Number(summary?.remaining_amount || 0).toLocaleString()}원
              </p>
              {!validSummary && (
                <p role="alert">
                  기존 문서 금액과 지급 합계를 확인해 주세요. 지급 등록을 중단했습니다.
                </p>
              )}
              {canPay && (
                <FinanceButton
                  type="button"
                  disabled={saving || blocked || formOpen}
                  onClick={openForm}
                  variant="primary"
                >
                  + 지급 등록
                </FinanceButton>
              )}
              {validSummary && remaining === 0 && <p>지급이 완료된 문서입니다.</p>}
              {approval.status !== "승인" && <p>최종 승인된 문서에 지급을 등록할 수 있습니다.</p>}
              {!isFinance && <p>지급 등록은 재무부 또는 MASTER 계정으로 진행해 주세요.</p>}
              {payments.length === 0 ? (
                <p>등록된 지급 내역이 없습니다.</p>
              ) : (
                <div className="table-shell finance-approval-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">지급 번호</th>
                        <th scope="col">지급일</th>
                        <th scope="col">금액</th>
                        <th scope="col">결제수단</th>
                        <th scope="col">계좌·카드 ID</th>
                        <th scope="col">입출금 구분</th>
                        <th scope="col">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.payment_id}>
                          <td>{payment.payment_id}</td>
                          <td>{payment.payment_date}</td>
                          <td>{Number(payment.amount).toLocaleString()}원</td>
                          <td>{payment.payment_method}</td>
                          <td>
                            {payment.account_id
                              ? `계좌 #${payment.account_id}`
                              : payment.card_id
                                ? `카드 #${payment.card_id}`
                                : "-"}
                          </td>
                          <td>{payment.payment_direction}</td>
                          <td>{payment.payment_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
      {formOpen &&
        (embedded ? (
          paymentForm
        ) : (
          <ModalBase title="지출 지급 등록" onClose={closeForm} layout={paymentForm} />
        ))}
    </section>
  );
}

// FinanceAttachments
// 결재 상세와 거래 전표에서 같은 첨부 화면/API를 재사용합니다.
export function FinanceAttachments({
  documentId,
  employeeId,
  canUpload = false,
  blocked = false,
  onBusyChange,
  onUploaded,
}) {
  const {
    files,
    loading,
    loadError,
    error,
    message,
    inputKey,
    saving,
    downloading,
    preview,
    previewUrl,
    previewLoading,
    isDraft,
    busy,
    setRefresh,
    setError,
    setPreview,
    setFile,
    setMessage,
    submit,
    download,
  } = useFinanceAttachmentsController({
    documentId,
    employeeId,
    canUpload,
    blocked,
    onBusyChange,
    onUploaded,
  });
  return (
    <section className="finance-attachments" aria-label="증빙파일">
      <h3>증빙파일</h3>

      <FinanceButton
        type="button"
        disabled={busy || loading || blocked}
        onClick={() => setRefresh((previous) => previous + 1)}
      >
        첨부 목록 새로고침
      </FinanceButton>
      {loading ? (
        <p>첨부파일 목록을 불러오는 중입니다.</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : files.length === 0 ? (
        <p>등록된 첨부파일이 없습니다.</p>
      ) : (
        <div className="table-shell finance-approval-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">파일명</th>
                <th scope="col">크기</th>
                <th scope="col">첨부일시</th>
                <th scope="col">파일 보기</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item) => (
                <tr key={item.file_id}>
                  <td>{item.original_name}</td>
                  <td>{formatApprovalAttachmentSize(item.file_size)}</td>
                  <td>{item.created_at || "-"}</td>
                  <td>
                    <FinanceButton
                      type="button"
                      disabled={busy || blocked}
                      onClick={() => {
                        setError("");
                        setPreview(item);
                      }}
                    >
                      미리보기
                    </FinanceButton>{" "}
                    <FinanceButton
                      type="button"
                      disabled={busy || blocked}
                      onClick={() => download(item)}
                    >
                      {downloading === item.file_id ? "다운로드 중..." : "다운로드"}
                    </FinanceButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview && (
        <div className="finance-attachment-preview">
          <FinanceButton type="button" onClick={() => setPreview(null)}>
            미리보기 닫기
          </FinanceButton>
          <p>{preview.original_name}</p>
          {previewLoading ? (
            <p>이미지를 불러오는 중입니다.</p>
          ) : (
            previewUrl && <img src={previewUrl} alt={preview.original_name} />
          )}
        </div>
      )}
      {canUpload && !isDraft ? (
        <form onSubmit={submit}>
          <fieldset disabled={busy || blocked}>
            <label>
              증빙 이미지{" "}
              <input
                key={inputKey}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError("");
                  setMessage("");
                }}
              />
            </label>
            <p>JPG, PNG, WEBP / 최대 5MB / 한 번에 1개</p>
            <FinanceButton type="submit" variant="primary">
              {saving ? "첨부 중..." : "증빙파일 첨부"}
            </FinanceButton>
          </fieldset>
        </form>
      ) : (
        !isDraft && <p>작성자만 대기 상태의 결재 문서에 증빙파일을 첨부할 수 있습니다.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
