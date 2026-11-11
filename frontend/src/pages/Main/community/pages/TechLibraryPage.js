// ===== [수정] 자유게시판과 같은 글·댓글·모달 흐름 및 첨부파일 연결 시작 =====
import React, { useState, useEffect, useRef } from 'react';

import PaginationTable from '../../../../components/PaginationTable';
import ModalBase from '../../../../components/ModalBase';
import { getLoginUser } from '../../../../utils/authStorage';
import {
    getTechLibraryPosts, addTechLibraryPost, updateTechLibraryPost,
    deleteTechLibraryPost, addTechLibraryComment, deleteTechLibraryComment,
    downloadTechLibraryFile
} from '../../../../utils/communityApi';

function TechLibraryPage() {

    const [postId, setPostId] = useState(null);
    const [employee] = useState(getLoginUser);
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const actionLock = useRef(false);
    const [downloading, setDownloading] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // [추가] 목록에서 바로 여는 첨부파일 업로드 창
    const [uploadTarget, setUploadTarget] = useState(null);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('기타');
    const [files, setFiles] = useState([]);
    const [removeFileIds, setRemoveFileIds] = useState([]);

    const selected = items.find(item => String(item.post_id) === postId);
    const existingFiles = (editingItem?.files || []).filter(file => !removeFileIds.includes(file.file_id));
    // [추가] CSS 파일을 바꾸지 않고 업무자료실 입력 영역의 크기만 지정
    const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginTop: 6, border: '1px solid #ccd6e5', borderRadius: 8, font: 'inherit' };
    const categories = ['기타', '연구개발(R&D)', '원료 및 성분', '생산·제조', '품질관리(QC/QA)', '인허가·규제', '제품·패키징', '영업·마케팅'];

    useEffect(() => {
        let active = true;
        getTechLibraryPosts()
            .then(posts => { if (active) setItems(posts); })
            .catch(error => { if (active) setLoadError(error.response?.data?.message || '업무자료실 목록을 불러오지 못했습니다.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => { setComment(''); }, [postId]);
    const openPost = id => { setMessage(''); setPostId(String(id)); };
    const showList = () => setPostId(null);

    // [추가] 작업 성공 후 재조회만 실패한 경우 중복 저장하지 않도록 구분
    const runAction = async (operation, afterSuccess, successMessage) => {
        if (actionLock.current) return;
        actionLock.current = true;
        setBusy(true);
        setMessage('');
        let completed = false;
        try {
            await operation();
            completed = true;
            afterSuccess();
            setItems(await getTechLibraryPosts());
            setMessage(successMessage);
        } catch (error) {
            setMessage(completed
                ? '작업은 저장되었지만 목록을 다시 읽지 못했습니다. 중복 실행하지 말고 새로고침해 주세요.'
                : error.response?.data?.message || '작업에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            actionLock.current = false;
            setBusy(false);
        }
    };

    const handleOpenWriteModal = (item = null) => {
        setMessage('');
        setEditingItem(item);
        setTitle(item?.post_title || '');
        setContent(item?.post_content || '');
        setCategory(item?.category || '기타');
        setFiles([]);
        setRemoveFileIds([]);
        setIsModalOpen(true);
    };
    const handleCloseWriteModal = () => {
        if (!actionLock.current) setIsModalOpen(false);
    };
    const chooseFiles = event => {
        const picked = Array.from(event.target.files || []);
        if (picked.length + existingFiles.length > 3 || picked.some(file => file.size > 5 * 1024 * 1024)) {
            setMessage('기존 파일과 새 파일을 합쳐 최대 3개, 파일당 5MB까지 선택해 주세요.');
            event.target.value = '';
            setFiles([]);
            return;
        }
        setMessage('');
        setFiles(picked);
    };
    const savePost = event => {
        event.preventDefault();
        if (!employee?.name) { setMessage('로그인 직원 정보를 확인해 주세요.'); return; }
        if (![title, content, category].every(value => value.trim())) { setMessage('제목, 내용, 분류를 입력해 주세요.'); return; }
        const data = new FormData();
        data.append('post_title', title.trim());
        data.append('post_content', content.trim());
        data.append('category', category.trim());
        data.append('author', employee.name);
        data.append('remove_file_ids', JSON.stringify(removeFileIds));
        files.forEach(file => data.append('files', file));
        runAction(
            () => editingItem ? updateTechLibraryPost(editingItem.post_id, data) : addTechLibraryPost(data),
            () => { setIsModalOpen(false); setFiles([]); },
            editingItem ? '자료가 수정되었습니다.' : '자료가 등록되었습니다.'
        );
    };
    const remove = item => {
        if (busy || !window.confirm('이 글과 첨부파일, 댓글을 함께 삭제할까요?')) return;
        runAction(() => deleteTechLibraryPost(item.post_id), () => {
            setItems(previous => previous.filter(post => post.post_id !== item.post_id));
            if (selected?.post_id === item.post_id) showList();
        }, '자료가 삭제되었습니다.');
    };
    const saveComment = event => {
        event.preventDefault();
        if (!comment.trim()) { setMessage('댓글 내용을 입력해 주세요.'); return; }
        if (!employee?.name || !selected) { setMessage('로그인 직원 정보와 게시글을 확인해 주세요.'); return; }
        runAction(() => addTechLibraryComment(selected.post_id, { content: comment.trim(), author: employee.name }), () => setComment(''), '댓글이 등록되었습니다.');
    };
    const removeComment = id => {
        if (busy || !window.confirm('댓글을 삭제할까요?')) return;
        runAction(() => deleteTechLibraryComment(selected.post_id, id), () => {}, '댓글이 삭제되었습니다.');
    };
    const download = async file => {
        if (downloading !== null) return;
        setDownloading(file.file_id);
        setMessage('');
        try { await downloadTechLibraryFile(selected.post_id, file); }
        catch { setMessage('첨부파일 다운로드에 실패했습니다.'); }
        finally { setDownloading(null); }
    };
    const date = value => value ? new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '-';
    const size = value => `${(Number(value) / 1024).toFixed(1)} KB`;
    const keyword = query.trim().toLowerCase();
    const filtered = items.filter(item => `${item.post_title} ${item.author}`.toLowerCase().includes(keyword));
    const openUpload = item => {
        setMessage('');
        setUploadFiles([]);
        setUploadTarget(item);
    };
    const chooseUploadFiles = event => {
        const picked = Array.from(event.target.files || []);
        if (picked.length + (uploadTarget.files || []).length > 3 || picked.some(file => file.size > 5 * 1024 * 1024)) {
            event.target.value = '';
            setUploadFiles([]);
            setMessage('기존 파일을 포함해 최대 3개, 파일당 5MB까지 올릴 수 있습니다.');
            return;
        }
        setMessage('');
        setUploadFiles(picked);
    };
    const saveUpload = event => {
        event.preventDefault();
        if (!uploadTarget || !uploadFiles.length) { setMessage('업로드할 파일을 선택해 주세요.'); return; }
        const data = new FormData();
        data.append('post_title', uploadTarget.post_title);
        data.append('post_content', uploadTarget.post_content);
        data.append('category', uploadTarget.category);
        data.append('remove_file_ids', '[]');
        uploadFiles.forEach(file => data.append('files', file));
        runAction(() => updateTechLibraryPost(uploadTarget.post_id, data), () => {
            setUploadTarget(null);
            setUploadFiles([]);
        }, '첨부파일이 등록되었습니다.');
    };
    const closeUpload = () => { if (!actionLock.current) setUploadTarget(null); };
    const tableData = filtered.map((item, index) => ({ content: [
        filtered.length - index,
        <button key={`title-${item.post_id}`} type="button" className="table-link-title" style={{ border: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }} disabled={busy} onClick={() => openPost(item.post_id)}>{item.post_title}</button>,
        item.author,
        date(item.created_at),
        (item.comments || []).length,
        <div key={`upload-${item.post_id}`} className="table-actions">
            <span>{(item.files || []).length}</span>
            <button type="button" disabled={busy} aria-label={`${item.post_title} 파일 올리기`} onClick={() => openUpload(item)}>파일 올리기</button>
        </div>,
        <div key={`actions-${item.post_id}`} className="table-actions">
            <button type="button" disabled={busy} onClick={() => handleOpenWriteModal(item)}>수정</button>
            <button type="button" disabled={busy} className="danger-button" onClick={() => remove(item)}>삭제</button>
        </div>
    ] }));

    const writeModalLayout = <form onSubmit={savePost} style={{ width: 'min(520px, calc(100vw - 96px))', maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14, minWidth: 0 }}>
            <div><label htmlFor="tech-title">제목</label><input id="tech-title" style={inputStyle} required maxLength={200} placeholder="제목을 입력해 주세요." value={title} onChange={event => setTitle(event.target.value)} /></div>
            <div><label htmlFor="tech-category">분류</label><select id="tech-category" style={inputStyle} required value={category} onChange={event => setCategory(event.target.value)}>
                {!categories.includes(category) && <option value={category}>{category}</option>}
                {categories.map(value => <option key={value} value={value}>{value}</option>)}
            </select></div>
            <div><label htmlFor="tech-content">내용</label><textarea id="tech-content" style={{ ...inputStyle, resize: 'vertical' }} required rows={8} placeholder="내용을 입력해 주세요." value={content} onChange={event => setContent(event.target.value)} /></div>
            {/* [추가] 기존 파일 유지·삭제 선택과 새 첨부파일 */}
            {editingItem && <div><h4>기존 첨부파일</h4>
                {(editingItem.files || []).map(file => <p key={file.file_id}><label>
                    <input type="checkbox" checked={removeFileIds.includes(file.file_id)} onChange={event => setRemoveFileIds(previous => event.target.checked ? [...previous, file.file_id] : previous.filter(id => id !== file.file_id))} />
                    삭제 선택: {file.file_name} ({size(file.file_size)})
                </label></p>)}
                <p className="subtext">삭제 선택한 파일은 수정하기를 눌렀을 때 삭제됩니다. 취소하면 유지됩니다.</p>
            </div>}
            <div><label htmlFor="tech-files">첨부파일</label><input id="tech-files" type="file" multiple onChange={chooseFiles} /></div>
            <p className="subtext">최대 3개, 파일당 5MB. 다시 선택하면 새 파일 선택 목록이 바뀝니다.</p>
            <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} ({size(file.size)})</li>)}</ul>
            {message && <p role="alert">{message}</p>}
            <div style={{ marginTop: '15px', textAlign: 'right' }}><button type="submit" className="erp-primary-button">{busy ? '저장 중…' : editingItem ? '수정하기' : '등록하기'}</button></div>
        </fieldset>
    </form>;

    return <div className="border-container">
        <header className="dashboard-header">
            <span className="subtitle">업무자료실</span>
            <div className="dashboard-top">{postId
                ? <button type="button" disabled={busy} onClick={showList}>목록으로</button>
                : <button type="button" className="register-btn" disabled={busy || loading || !!loadError} onClick={() => handleOpenWriteModal()}>+ 글쓰기</button>}
            </div>
        </header>
        <hr />
        {loading && <p className="no-data">업무자료실 목록을 불러오는 중입니다.</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!isModalOpen && !uploadTarget && message && <p role="status">{message}</p>}
        {!loading && !loadError && !postId && <>
            <div className="filter-bar"><label className="search-field">검색:<input style={{ ...inputStyle, width: 'min(320px, 100%)' }} placeholder="제목 또는 작성자 검색" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
            <PaginationTable key={keyword} title="업무자료실 목록" th={['번호', '제목', '작성자', '작성일', '댓글수', '첨부파일 수', '관리']} allData={tableData} itemsPerPage={10} />
        </>}
        {!loading && !loadError && postId && (selected ? <article className="detail-card" style={{ background: 'var(--color-surface, white)', padding: 24, border: '1px solid #dfe7ee', borderRadius: 12 }}>
            <header><h3>{selected.post_title}</h3><span className="subtext">작성자: {selected.author} | 분류: {selected.category} | 작성일: {date(selected.created_at)} | 최근수정: {date(selected.updated_at)}</span></header>
            <hr />
            <div className="detail-body" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.post_content}</div>
            <div className="table-actions"><button type="button" disabled={busy} onClick={() => handleOpenWriteModal(selected)}>수정</button><button type="button" className="danger-button" disabled={busy} onClick={() => remove(selected)}>삭제</button></div>
            <hr />
            <h4>첨부파일 ({(selected.files || []).length})</h4>
            {(selected.files || []).length === 0 && <p className="no-data">첨부파일이 없습니다.</p>}
            <ul>{(selected.files || []).map(file => <li key={file.file_id}><button type="button" disabled={downloading !== null} onClick={() => download(file)}>{file.file_name} ({size(file.file_size)}) — {downloading === file.file_id ? '다운로드 중…' : '다운로드'}</button></li>)}</ul>
            <hr />
            <section className="comment-section">
                <h4>댓글 ({(selected.comments || []).length})</h4>
                <div className="comment-list">{(selected.comments || []).map(c => <div key={c.id} className="comment-item">
                    <div className="comment-meta"><strong>{c.author}</strong><span className="subtext"> ({date(c.created_at)})</span><p className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</p></div>
                    <button type="button" className="danger-button" disabled={busy} onClick={() => removeComment(c.id)}>삭제</button>
                </div>)}{(selected.comments || []).length === 0 && <p className="no-data">등록된 댓글이 없습니다.</p>}</div>
                <form className="comment-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }} onSubmit={saveComment}><input style={{ ...inputStyle, flex: '1 1 200px', width: 'auto', marginTop: 0 }} aria-label="댓글 내용" placeholder="댓글을 입력하세요" maxLength={10000} value={comment} disabled={busy} onChange={event => setComment(event.target.value)} /><button type="submit" className="register-btn" disabled={busy}>댓글 등록</button></form>
            </section>
        </article> : <p className="no-data">게시글을 찾을 수 없습니다. 목록으로 돌아가 주세요.</p>)}
        {isModalOpen && <ModalBase onClose={handleCloseWriteModal} title={editingItem ? '게시글 수정' : '글쓰기'} layout={writeModalLayout} />}
        {uploadTarget && <ModalBase onClose={closeUpload} title="첨부파일 올리기" layout={
            <form onSubmit={saveUpload} style={{ width: 'min(480px, calc(100vw - 96px))', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
                    <p><strong>{uploadTarget.post_title}</strong></p>
                    <p className="subtext">기존 파일 {(uploadTarget.files || []).length}개 / 최대 3개, 파일당 5MB</p>
                    <label>업로드할 파일<input type="file" multiple onChange={chooseUploadFiles} style={inputStyle} /></label>
                    <ul>{uploadFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} ({size(file.size)})</li>)}</ul>
                    {(uploadTarget.files || []).length >= 3 && <p>파일이 3개입니다. 수정 화면에서 기존 파일을 삭제한 후 추가해 주세요.</p>}
                    {message && <p role="alert">{message}</p>}
                    <div className="table-actions"><button type="button" onClick={closeUpload}>취소</button><button type="submit" className="register-btn" disabled={busy || !uploadFiles.length}>{busy ? '업로드 중…' : '업로드'}</button></div>
                </fieldset>
            </form>
        } />}
    </div>;
}
export default TechLibraryPage;
// ===== [수정] 자유게시판과 같은 글·댓글·모달 흐름 및 첨부파일 연결 끝 =====
