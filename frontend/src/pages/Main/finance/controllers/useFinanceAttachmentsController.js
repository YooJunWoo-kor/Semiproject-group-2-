// 담당 화면: 여러 재무 화면
// 역할: 첨부파일 조회·업로드·다운로드·미리보기 URL 관리을 담당합니다.
// 첨부 조회·업로드·다운로드와 미리보기 URL 수명을 관리합니다.
import { useEffect, useState } from "react";
import { getFinanceError } from "../utils/financeDataUtils";
import {
  isDraftApprovalDocument,
  validateApprovalAttachment,
} from "../models/financeApprovalModel";
import {
  getApprovalAttachments,
  uploadApprovalAttachment,
  downloadApprovalAttachment,
} from "../../../../utils/financeService";

export default function useFinanceAttachmentsController({
  documentId,
  employeeId,
  canUpload = false,
  blocked = false,
  onBusyChange,
  onUploaded,
}) {
  // 화면 상태
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const isDraft = isDraftApprovalDocument(documentId);
  const busy = saving || downloading !== null;
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    async function load() {
      try {
        const rows = await getApprovalAttachments(documentId);
        if (!cancelled) setFiles(rows);
      } catch (err) {
        if (!cancelled) setLoadError(getFinanceError(err, "첨부파일 목록을 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [documentId, refresh]);
  useEffect(() => {
    let cancelled = false;
    let url;
    setPreviewUrl("");
    setPreviewLoading(Boolean(preview));
    if (preview)
      downloadApprovalAttachment(documentId, preview.file_id)
        .then((blob) => {
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        })
        .catch((err) => {
          if (!cancelled) setError(getFinanceError(err, "이미지를 불러오지 못했습니다."));
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, preview]);
  async function submit(event) {
    event.preventDefault();
    if (blocked || busy || !canUpload || isDraft) return;
    setError("");
    setMessage("");
    const validationError = validateApprovalAttachment(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await uploadApprovalAttachment(documentId, file, employeeId);
      setFile(null);
      setInputKey((previous) => previous + 1);
      setRefresh((previous) => previous + 1);
      setMessage("증빙파일이 첨부되었습니다.");
      try {
        await onUploaded?.();
      } catch {
        setMessage("첨부는 완료되었습니다. 문서의 첨부 건수는 새로고침해 확인해주세요.");
      }
    } catch (err) {
      setError(
        getFinanceError(err, "첨부 결과를 확인하지 못했습니다. 목록을 새로고침해 확인해주세요."),
      );
    } finally {
      setSaving(false);
    }
  }
  async function download(item) {
    if (busy || blocked) return;
    setDownloading(item.file_id);
    setError("");
    let url;
    let link;
    try {
      const blob = await downloadApprovalAttachment(documentId, item.file_id);
      url = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = url;
      link.download = item.original_name;
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      setError(getFinanceError(err, "첨부파일을 다운로드하지 못했습니다."));
    } finally {
      link?.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloading(null);
    }
  }
  // 화면에 전달할 상태와 동작
  return {
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
  };
}
