// 담당 화면: 자금관리 → 법인카드
// 역할: 카드 월 한도 변경 입력 창
import React from "react";
import ModalBase from "../../../../../components/ModalBase";

export default function CorpCardLimitModal({
  closeLimitModal,
  handleLimitSubmit,
  limitError,
  limitSaving,
  limitTarget,
  monthlyLimitInput,
  setMonthlyLimitInput,
}) {
  return (
    <div className="finance-registration-modal">
      <ModalBase
        title="법인카드 한도변경"
        onClose={closeLimitModal}
        layout={
          <section aria-label="법인카드 한도변경">
            <p>법인카드: {limitTarget.cardName}</p>
            <p>당월 사용량: {limitTarget.currentUsage.toLocaleString()}원</p>

            <form onSubmit={handleLimitSubmit}>
              <label htmlFor="card-monthly-limit">월 한도 *</label>
              <input
                id="card-monthly-limit"
                type="number"
                min="0"
                step="1"
                value={monthlyLimitInput}
                onChange={(e) => setMonthlyLimitInput(e.target.value)}
                required
                disabled={limitSaving}
              />

              <p>월 한도는 당월 사용량 이상이어야 합니다.</p>

              {limitError && <p role="alert">{limitError}</p>}

              <button type="submit" disabled={limitSaving}>
                {limitSaving ? "저장 중..." : "저장"}
              </button>

              <button type="button" disabled={limitSaving} onClick={closeLimitModal}>
                취소
              </button>
            </form>
          </section>
        }
      />
    </div>
  );
}
