import React, { useState } from "react";
import { addCommunityBoard } from "../../../../utils/communityApi";

function SetNewBoardLayout({ onSuccess, onClose }) {
  const [boardName, setBoardName] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errStep, setErrStep] = useState(0); // 0: 정상, 1: 이름 미입력

  const handleRegister = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!boardName.trim()) return setErrStep(1);

    setErrStep(0);
    setServerError("");
    setBusy(true);

    try {
      const res = await addCommunityBoard({
        board_name: boardName.trim(),
      });

      if (res.status === "succesed") {
        alert(`"${boardName.trim()}" 게시판이 등록되었습니다.`);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      setServerError(
        error.response?.data?.message || "게시판 등록 중 오류가 발생했습니다."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form
        style={{ display: "flex", flexFlow: "column", gap: "14px" }}
        onSubmit={handleRegister}
      >
        <div className="form-group">
          <label>게시판 이름</label>
          <input
            value={boardName}
            maxLength={50}
            onChange={(e) => {
              setBoardName(e.target.value);
              if (errStep === 1) setErrStep(0);
            }}
            placeholder="예: 사내 이벤트, 동호회"
            autoFocus
          />
          {errStep === 1 && (
            <div style={{ fontSize: "11px", color: "red", marginTop: "4px" }}>
              게시판 이름을 입력해 주세요.
            </div>
          )}
        </div>

        {serverError && (
          <div style={{ fontSize: "12px", color: "red" }}>{serverError}</div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            type="submit"
            className="erp-primary-button"
            disabled={busy}
            style={{ marginLeft: "auto" }}
          >
            {busy ? "등록 중..." : "완료"}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default SetNewBoardLayout;