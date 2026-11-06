import React from "react";
import "../css/Form.css";
import "../css/Table.css";

function formatSize(size) {
  if (size == null) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// files: 새로 선택한 File 객체 배열
// existingFiles: [{ id, name, size }] 형태로 변환한 기존 첨부 목록
// 서버 통신과 삭제 예정 목록은 부모 폼에서 관리합니다.
export default function AttachmentField({
  files = [],
  onChange,
  existingFiles = [],
  onDownload,
  onRemoveExisting,
  accept,
  readOnly = false,
  disabled = false,
}) {
  function handleSelect(event) {
    const selectedFiles = Array.from(event.target.files || []);
    // 같은 파일이 반복 선택되면 중복 추가하지 않습니다.
    const nextFiles = [...files];
    selectedFiles.forEach((file) => {
      const duplicate = nextFiles.some((item) =>
        item.name === file.name &&
        item.size === file.size &&
        item.lastModified === file.lastModified
      );
      if (!duplicate) nextFiles.push(file);
    });
    if (selectedFiles.length) onChange(nextFiles);
    // 선택 취소 후에도 같은 파일을 다시 선택할 수 있습니다.
    event.target.value = "";
  }

  function removeSelected(index) {
    onChange(files.filter((file, fileIndex) => fileIndex !== index));
  }

  const editable = !readOnly && typeof onChange === "function";
  const hasActions = Boolean(onDownload) || (!readOnly && Boolean(onRemoveExisting)) || editable;

  return (
    <section aria-label="첨부파일">
      {editable && (
        <p className="form-inputs">
          <label>
            첨부파일 선택
            <input
              type="file"
              multiple
              accept={accept}
              disabled={disabled}
              onChange={handleSelect}
            />
          </label>
        </p>
      )}
      <div className="table-shell">
        <table>
          <caption>첨부파일 목록</caption>
          <thead>
            <tr>
              <th scope="col">파일명</th>
              <th scope="col">크기</th>
              <th scope="col">구분</th>
              {hasActions && <th scope="col">관리</th>}
            </tr>
          </thead>
          <tbody>
            {existingFiles.map((file) => (
              <tr key={`saved-${file.id}`}>
                <td>{file.name}</td>
                <td>{formatSize(file.size)}</td>
                <td>저장됨</td>
                {hasActions && (
                  <td>
                    {onDownload && (
                      <button type="button" disabled={disabled} onClick={() => onDownload(file)}>
                        다운로드
                      </button>
                    )}
                    {!readOnly && onRemoveExisting && (
                      <button type="button" disabled={disabled} onClick={() => onRemoveExisting(file)}>
                        삭제 예정
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {files.map((file, index) => (
              <tr key={`new-${file.name}-${file.size}-${file.lastModified}-${index}`}>
                <td>{file.name}</td>
                <td>{formatSize(file.size)}</td>
                <td>새 파일</td>
                {hasActions && (
                  <td>
                    {editable && (
                      <button type="button" disabled={disabled} onClick={() => removeSelected(index)}>
                        선택 취소
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!files.length && !existingFiles.length && (
              <tr>
                <td className="no-data" colSpan={hasActions ? 4 : 3}>첨부파일이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
