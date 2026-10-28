// 연습용 초기 데이터
export const sampleProjects = [
  { id: 1, name: '비건 선케어 라인 출시', owner: '제품개발팀', status: '진행 중', start: '2026-10-01', due: '2026-11-30', memo: '원료 적합성 검토' },
  { id: 2, name: '앰플 용기 리뉴얼', owner: '상품기획팀', status: '검토', start: '2026-10-20', due: '2026-12-18', memo: '샘플 평가' }
];

export const sampleTasks = [
  { id: 101, projectId: 1, name: '원료 적합성 검토', start: '2026-10-01', due: '2026-10-25', status: '완료', progress: 100, priority: '보통' },
  { id: 102, projectId: 1, name: '시제품 제작', start: '2026-10-15', due: '2026-11-05', status: '진행 중', progress: 60, priority: '높음' }
];

export const emptyProject = { name: '', owner: '', status: '검토', start: '', due: '', memo: '' };

