import { useMemo, useState } from 'react';

const presets = {
  project: {
    title: '프로젝트 관리', subtitle: '신제품 개발과 생산 전환 일정을 관리합니다.',
    noun: '프로젝트', columns: ['프로젝트명', '담당 부서', '상태', '목표일'],
    rows: [
      { id: 1, name: '비건 선케어 라인 출시', owner: '제품개발팀', status: '진행 중', due: '2026-11-30', memo: '원료 적합성 검토 및 양산 전환' },
      { id: 2, name: '앰플 용기 리뉴얼', owner: '상품기획팀', status: '검토', due: '2026-12-18', memo: '협력사 샘플 평가' }
    ]
  },
  crm: {
    title: '고객·거래처 관리', subtitle: '유통 파트너와 영업 기회를 관리합니다.',
    noun: '거래처', columns: ['거래처명', '담당자', '상태', '다음 연락일'],
    rows: [
      { id: 1, name: '뷰티온 유통', owner: '이서연', status: '거래 중', due: '2026-10-27', memo: '4분기 공급 수량 협의' },
      { id: 2, name: '라온면세점', owner: '박지훈', status: '상담', due: '2026-11-03', memo: '입점 제안서 전달 완료' }
    ]
  }
};

export default function OperationalModule({ type }) {
  const config = presets[type];
  const [rows, setRows] = useState(config.rows);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const filtered = useMemo(() => rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query.toLowerCase()))), [rows, query]);

  function beginCreate() {
    setEditing({ id: null, name: '', owner: '', status: '검토', due: '', memo: '' });
  }
  function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = { id: editing.id || Date.now(), name: form.get('name').trim(), owner: form.get('owner').trim(), status: form.get('status'), due: form.get('due'), memo: form.get('memo').trim() };
    if (!next.name || !next.owner || !next.due) return;
    setRows(current => editing.id ? current.map(row => row.id === editing.id ? next : row) : [next, ...current]);
    setSelected(next); setEditing(null);
  }
  function remove(id) {
    if (window.confirm(`${config.noun}을(를) 삭제하시겠습니까?`)) {
      setRows(current => current.filter(row => row.id !== id)); setSelected(null);
    }
  }

  return <section className="workspace-page">
    <header className="page-header"><div><span className="eyebrow">OPERATIONS</span><h1>{config.title}</h1><p>{config.subtitle}</p></div><button className="erp-primary-button" onClick={beginCreate}>+ {config.noun} 등록</button></header>
    {editing ? <form className="erp-form" onSubmit={save}>
      <h2>{editing.id ? `${config.noun} 수정` : `새 ${config.noun} 등록`}</h2>
      <div className="form-grid"><label>이름<input name="name" defaultValue={editing.name} required /></label><label>담당<input name="owner" defaultValue={editing.owner} required /></label><label>상태<select name="status" defaultValue={editing.status}><option>검토</option><option>진행 중</option><option>거래 중</option><option>상담</option><option>완료</option></select></label><label>목표일<input name="due" type="date" defaultValue={editing.due} required /></label></div>
      <label>메모<textarea name="memo" defaultValue={editing.memo} /></label><div className="button-row"><button type="button" onClick={() => setEditing(null)}>취소</button><button type="submit">저장</button></div>
    </form> : selected ? <article className="detail-card"><div className="page-header"><div><span className="status-badge">{selected.status}</span><h2>{selected.name}</h2></div><button onClick={() => setSelected(null)}>목록으로</button></div><dl><div><dt>담당</dt><dd>{selected.owner}</dd></div><div><dt>목표일</dt><dd>{selected.due}</dd></div><div><dt>업무 메모</dt><dd>{selected.memo || '등록된 메모가 없습니다.'}</dd></div></dl><div className="button-row"><button onClick={() => setEditing(selected)}>수정</button><button className="danger-button" onClick={() => remove(selected.id)}>삭제</button></div></article> : <>
      <div className="filter-bar"><label className="search-field">검색<input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름, 담당자, 상태 검색" /></label><span>총 {filtered.length}건</span></div>
      <div className="table-shell"><table><thead><tr>{config.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id} onClick={() => setSelected(row)} tabIndex="0"><td><button className="link-button" onClick={() => setSelected(row)}>{row.name}</button></td><td>{row.owner}</td><td><span className="status-badge">{row.status}</span></td><td>{row.due}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">조건에 맞는 항목이 없습니다.</div>}</div>
    </>}
  </section>;
}
