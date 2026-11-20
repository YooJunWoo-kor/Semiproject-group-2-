// 담당 화면: 거래처 관리
// 역할: 거래처 기본정보 상세
import { FinanceActions } from "../ui/FinanceFormControls";
import { FinanceButton } from "../ui/FinanceButton";
import { getPartnerClosingDayLabel } from "../../models/financePartnerModel";
import React from "react";
import { FinanceDetailRows } from "../ui/FinanceDetailDisplay";
import ModalBase from "../../../../../components/ModalBase";
import { TOGLE_COLORS } from "../../../../../utils/authStorage";
import { getPartnerCalendarTypeId } from "../../models/financePartnerModel";

export default function PartnerDetailModal({
  closePartnerDetail,
  deleting,
  handlePartnerDelete,
  openEditPartnerForm,
  saving,
  selectedPartner,
}) {
  return (
    <div className="finance-registration-modal finance-partner-detail">
      <ModalBase
        title="거래처 상세정보"
        onClose={closePartnerDetail}
        layout={
          <section aria-label="거래처 상세정보">
            <div className="table-shell">
              <table>
                <tbody>
                  {/* [공통화] 거래처·카드·결재·품목 상세 행 재사용 */}
                  <FinanceDetailRows
                    rows={[
                      ["거래처 번호", <>{selectedPartner.id}</>],
                      ["거래처명", <>{selectedPartner.name}</>],
                      ["거래 구분", <>{selectedPartner.type}</>],
                      ["업체 유형", <>{selectedPartner.companyType}</>],
                      ["사업자번호", <>{selectedPartner.bizNumber}</>],
                      ["대표자", <>{selectedPartner.ceo}</>],
                      ["연락처", <>{selectedPartner.contact}</>],
                      ["주소", <>{selectedPartner.address}</>],
                      ["정기 마감일", <>{getPartnerClosingDayLabel(selectedPartner)}</>],
                      [
                        "일정 색상",
                        <>
                          <span
                            aria-hidden="true"
                            className="finance-color-swatch finance-color-current"
                            style={{
                              backgroundColor:
                                TOGLE_COLORS?.[getPartnerCalendarTypeId(selectedPartner)] ||
                                "var(--color-brand)",
                            }}
                          />
                          {selectedPartner.calendarTypeId === "" ? "기본 색상" : "선택한 색상"}
                        </>,
                      ],
                      ["은행명", <>{selectedPartner.bankInfo.bank}</>],
                      ["계좌번호", <>{selectedPartner.bankInfo.account}</>],
                      ["예금주", <>{selectedPartner.bankInfo.holder}</>],
                      ["메모", <>{selectedPartner.memo}</>],
                    ]}
                  />
                </tbody>
              </table>
            </div>
            <FinanceActions className="finance-detail-actions">
              <FinanceButton
                type="button"
                disabled={saving || deleting}
                onClick={() => openEditPartnerForm(selectedPartner)}
                variant="primary"
              >
                수정
              </FinanceButton>
              <FinanceButton
                type="button"
                className="finance-detail-delete"
                disabled={saving || deleting}
                onClick={() => handlePartnerDelete(selectedPartner)}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </FinanceButton>
            </FinanceActions>
          </section>
        }
      />
    </div>
  );
}
