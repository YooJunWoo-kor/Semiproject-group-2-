import React, { useState } from "react";
import { getLoginUser } from "../../../../utils/authStorage";
import { addBoardPost, updateBoardPost } from "../../../../utils/communityApi";

export default function BoardWriteModal({
  apiPath,
  editingPost,
  hasCategory,
  categoryOptions,
  onSuccess,
  onClose,
}) {
  const [title, setTitle] = useState(editingPost?.title || "");
  const [content, setContent] = useState(editingPost?.content || "");
  const [category, setCategory] = useState(
    editingPost?.category || categoryOptions[0] || ""
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const inputStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    padding: "10px 12px",
    border: "1px solid #ccd6e5",
    borderRadius: 8,
    font: "inherit",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!title.trim() || !content.trim()) {
      return setFormError("제목과 내용을 입력해 주세요.");
    }

    const user = getLoginUser();
    const employeeId = Number(user?.employee_id ?? user?.employeeKey);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return setFormError("로그인 직원 정보를 확인해 주세요.");
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category: hasCategory ? category : null,
      employee_id: employeeId,
    };

    setBusy(true);
    setFormError("");
    try {
      if (editingPost == null) {
        await addBoardPost(apiPath, payload);
        alert("게시글이 등록되었습니다.");
      } else {
        await updateBoardPost(apiPath, editingPost.post_id, payload);
        alert("게시글이 수정되었습니다.");
      }
      onSuccess();
    } catch (error) {
      setFormError(error.response?.data?.message || "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "min(520px, calc(100vw - 96px))",
        maxHeight: "calc(100vh - 180px)",
        overflowY: "auto",
      }}
    >
      <fieldset
        disabled={busy}
        style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 16, minWidth: 0 }}
      >
        <label>
          제목
          <input
            required
            maxLength={200}
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {hasCategory && (
          <label>
            분류
            <select
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categoryOptions.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          내용
          <textarea
            required
            rows={8}
            style={{ ...inputStyle, resize: "vertical" }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>

        {formError && <p role="alert">{formError}</p>}

        <div className="table-actions">
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit" className="erp-primary-button">
            {busy ? "저장 중…" : editingPost == null ? "등록하기" : "수정하기"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}