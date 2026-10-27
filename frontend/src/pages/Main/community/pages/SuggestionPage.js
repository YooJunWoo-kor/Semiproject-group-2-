import { useMemo, useState } from 'react';
import useCommunityItems from './useCommunityItems';

// 디버깅 및 UI 확인용 더미 데이터
const DUMMY_SUGGESTIONS = [
  {
    id: 1,
    title: '원자재 재고 실사 주기 단축 요청',
    author: '김생산',
    content: '원자재 입출고 차이가 발생하여 주간 실사 주기를 단축했으면 합니다.',
    status: '접수',
    result: '',
    createdAt: '2026-10-20',
  },
  {
    id: 2,
    title: '재무 결재 프로세스 모바일 승인 지원 건의',
    author: '이재무',
    content: '외근 중 긴급 지출 결의서 처리가 지연되어 모바일 결재 승인 기능이 필요합니다.',
    status: '검토 중',
    result: '관련 시스템 API 및 보안 정책 검토 진행 중입니다.',
    createdAt: '2026-10-22',
  },
  {
    id: 3,
    title: 'ERP 로그인 세션 유지 시간 연장',
    author: '박영업',
    content: '단가 입력 중 세션이 끊겨 작성 데이터가 유실됩니다.',
    status: '처리 완료',
    result: '기본 만료 시간을 30분에서 60분으로 연장 조치 완료했습니다.',
    createdAt: '2026-10-25',
  },
];


export default function SuggestionPage() {
  const STATUSES = ['접수', '검토 중', '처리 완료'];
  
  // 처리 상태별 뱃지 스타일 헬퍼
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case '처리 완료':
        return 'status-badge status-complete';
      case '검토 중':
        return 'status-badge status-review';
      default:
        return 'status-badge status-pending';
    }
  };

  const { items } = useCommunityItems('suggestions');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');

  // 검색어 및 상태 필터링
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchText = `${item.title} ${item.author} ${item.content}`.toLowerCase();
      const matchesQuery = searchText.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === '전체' || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  // 클릭 이벤트 핸들러 (추후 상세 페이지/모달 연동용)
  const handleItemClick = (item) => {
    console.log('선택된 항목:', item);
    // TODO: 상세 페이지 이동 또는 모달 오픈 처리
  };

  return (
    <div>
      <h1>업무 개선 건의</h1>
      {/* 필터 및 검색 바 */}
      {/* 컴포넌트 화 시킬지 고민 */}
      <div>
        <label>
          제목·작성자·내용 검색
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
          />
        </label>

        <label>
          처리 상태
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['전체', ...STATUSES].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <span>총 {filteredItems.length}건</span>
      </div>

      {/* 건의사항 목록 테이블 */}
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>건의 제목</th>
              <th>작성자</th>
              <th>등록일</th>
              <th>처리 상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.title}
                  </button>
                </td>
                <td>{item.author}</td>
                <td>{item.createdAt || '-'}</td>
                <td>
                  <span className={getStatusBadgeClass(item.status)}>
                    {item.status || '접수'}
                  </span>
                </td>
              </tr>
            ))}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan="4" className="no-data">
                  조건에 맞는 건의사항이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}