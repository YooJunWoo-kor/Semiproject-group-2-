import React, { useEffect, useState } from 'react';
import { getApprovalAttachments, uploadApprovalAttachment, downloadApprovalAttachment } from '../../../../utils/financeService';
import { getFinanceError } from './financeUtils';

// 결재 상세와 거래 전표에서 같은 첨부 화면/API를 재사용합니다.
export default function FinanceAttachments({ documentId, employeeId, canUpload = false, blocked = false, onBusyChange, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [inputKey, setInputKey] = useState(0);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const isDraft = String(documentId).startsWith('draft-');
  const busy = saving || downloading !== null;

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    async function load() {
      try {
        const rows = await getApprovalAttachments(documentId);
        if (!cancelled) setFiles(rows);
      } catch (err) {
        if (!cancelled) setLoadError(getFinanceError(err, '첨부파일 목록을 불러오지 못했습니다.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [documentId, refresh]);

  useEffect(() => {
    let cancelled = false;
    let url;
    setPreviewUrl('');
    setPreviewLoading(Boolean(preview));
    if (preview) {
      downloadApprovalAttachment(documentId, preview.file_id).then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }).catch(err => {
        if (!cancelled) setError(getFinanceError(err, '이미지를 불러오지 못했습니다.'));
      }).finally(() => { if (!cancelled) setPreviewLoading(false); });
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [documentId, preview]);

  async function submit(event) {
    event.preventDefault();
    if (blocked || busy || !canUpload || isDraft) return;
    setError('');
    setMessage('');
    if (!file) return setError('첨부할 이미지를 선택해주세요.');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      return setError('JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.');
    }
    if (file.size > 5 * 1024 * 1024) return setError('파일은 최대 5MB까지 첨부할 수 있습니다.');
    if (Array.from(file.name).length > 255) return setError('파일명은 255자 이내로 작성해주세요.');
    setSaving(true);
    try {
      await uploadApprovalAttachment(documentId, file, employeeId);
      setFile(null);
      setInputKey(previous => previous + 1);
      setRefresh(previous => previous + 1);
      setMessage('증빙파일이 첨부되었습니다.');
      try { await onUploaded?.(); }
      catch { setMessage('첨부는 완료되었습니다. 문서의 첨부 건수는 새로고침해 확인해주세요.'); }
    } catch (err) {
      setError(getFinanceError(err, '첨부 결과를 확인하지 못했습니다. 목록을 새로고침해 확인해주세요.'));
    } finally { setSaving(false); }
  }

  async function download(item) {
    if (busy || blocked) return;
    setDownloading(item.file_id);
    setError('');
    let url;
    let link;
    try {
      const blob = await downloadApprovalAttachment(documentId, item.file_id);
      url = URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.download = item.original_name;
      document.body.appendChild(link);
      link.click();
    } catch (err) { setError(getFinanceError(err, '첨부파일을 다운로드하지 못했습니다.')); }
    finally {
      link?.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloading(null);
    }
  }

  return <section className="finance-attachments" aria-label="증빙파일">
    <h3>증빙파일</h3>
    {isDraft && <p>내업무관리 기안서에 첨부된 영수증입니다. 원본 파일을 그대로 조회합니다.</p>}
    <button type="button" disabled={busy || loading || blocked} onClick={() => setRefresh(previous => previous + 1)}>첨부 목록 새로고침</button>
    {loading ? <p>첨부파일 목록을 불러오는 중입니다.</p> : loadError ? <p role="alert">{loadError}</p> : files.length === 0 ? <p>등록된 첨부파일이 없습니다.</p> : <div className="table-shell finance-approval-scroll">
      <table>
        <thead><tr><th scope="col">파일명</th><th scope="col">크기</th><th scope="col">첨부일시</th><th scope="col">파일 보기</th></tr></thead>
        <tbody>{files.map(item => <tr key={item.file_id}>
          <td>{item.original_name}</td>
          <td>{(Number(item.file_size) / 1024).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}KB</td>
          <td>{item.created_at || '-'}</td>
          <td><button type="button" disabled={busy || blocked} onClick={() => { setError(''); setPreview(item); }}>미리보기</button>{' '}
            <button type="button" disabled={busy || blocked} onClick={() => download(item)}>{downloading === item.file_id ? '다운로드 중...' : '다운로드'}</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {preview && <div className="finance-attachment-preview">
      <button type="button" onClick={() => setPreview(null)}>미리보기 닫기</button>
      <p>{preview.original_name}</p>
      {previewLoading ? <p>이미지를 불러오는 중입니다.</p> : previewUrl && <img src={previewUrl} alt={preview.original_name} />}
    </div>}
    {canUpload && !isDraft ? <form onSubmit={submit}>
      <fieldset disabled={busy || blocked}>
        <label>증빙 이미지 <input key={inputKey} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={event => { setFile(event.target.files?.[0] || null); setError(''); setMessage(''); }} /></label>
        <p>JPG, PNG, WEBP / 최대 5MB / 한 번에 1개</p>
        <button type="submit">{saving ? '첨부 중...' : '증빙파일 첨부'}</button>
      </fieldset>
    </form> : !isDraft && <p>작성자만 대기 상태의 결재 문서에 증빙파일을 첨부할 수 있습니다.</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
