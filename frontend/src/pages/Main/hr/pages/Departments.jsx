import React, { useState } from "react";
import StatisticsCard from "../../../../components/StatisticsCard";
import ModalBase from "../../../../components/ModalBase";
import { getLoginUser } from "../../../../utils/authStorage";

// 1. [상단 분리] 신규 부서 등록 폼 컴포넌트
function DepartmentRegisterForm({ onRegister, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    lead: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.lead.trim()) {
      alert("부서명과 부서장을 모두 입력해 주세요.");
      return;
    }

    onRegister({
      name: form.name.trim(),
      lead: form.lead.trim(),
      description: form.description.trim() || "부서 설명 없음"
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          부서명
        </label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: 플랫폼개발팀"
          required
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          부서장 이름
        </label>
        <input
          value={form.lead}
          onChange={(e) => setForm({ ...form, lead: e.target.value })}
          placeholder="예: 김민준"
          required
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
          부서 업무 설명
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="부서의 주요 업무와 역할을 입력하세요."
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none' }}
        />
      </div>

      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '8px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}
        >
          취소
        </button>
        <button
          type="submit"
          className="erp-primary-button"
          style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
        >
          등록 완료
        </button>
      </div>
    </form>
  );
}

// 초기 부서 데이터 (기존 유지)
const initialDepartments = [
  { id: 1, name: '개발팀', lead: '김민준', count: 32, description: '서비스 개발 및 기술 운영' },
  { id: 2, name: '인사팀', lead: '이서연', count: 8, description: '인사 운영 및 조직문화' },
  { id: 3, name: '디자인팀', lead: '박지호', count: 14, description: '브랜드 및 제품 디자인' },
  { id: 4, name: '마케팅팀', lead: '최유진', count: 21, description: '마케팅 전략 및 고객 커뮤니케이션' },
  { id: 5, name: '경영지원팀', lead: '정도윤', count: 17, description: '재무 및 사내 운영 지원' },
  { id: 6, name: '영업팀', lead: '윤지훈', count: 36, description: '고객 관리 및 사업 개발' },
];

// 부서별 소속 직원 더미데이터 (Employees.jsx 데이터와 연동)
const initialMembers = [
  { id: 'EMP-1001', name: '김민준', department: '개발팀', position: '팀장', email: 'minjun.kim@enova.co.kr', status: '재직' },
  { id: 'EMP-1006', name: '한지우', department: '개발팀', position: '사원', email: 'jiwoo.han@enova.co.kr', status: '재직' },
  { id: 'EMP-1002', name: '이서연', department: '인사팀', position: '대리', email: 'seoyeon.lee@enova.co.kr', status: '재직' },
  { id: 'EMP-1003', name: '박지호', department: '디자인팀', position: '사원', email: 'jiho.park@enova.co.kr', status: '재직' },
  { id: 'EMP-1004', name: '최유진', department: '마케팅팀', position: '과장', email: 'yujin.choi@enova.co.kr', status: '휴직' },
  { id: 'EMP-1005', name: '정도윤', department: '경영지원팀', position: '대리', email: 'doyun.jung@enova.co.kr', status: '재직' },
  { id: 'EMP-1007', name: '윤지훈', department: '영업팀', position: '팀장', email: 'jihun.yoon@enova.co.kr', status: '재직' },
];

export default function Departments() {
  const loginUser = getLoginUser();
  const isMaster = loginUser?.role === 'MASTER';

  const [departments, setDepartments] = useState(initialDepartments);
  const [members, setMembers] = useState(initialMembers);
  const [selectedDeptId, setSelectedDeptId] = useState(initialDepartments[0].id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // 현재 선택된 부서 객체
  const selectedDept = departments.find((d) => d.id === selectedDeptId) || departments[0];

  // 선택된 부서에 속한 사원 리스트 필터링
  const currentMembers = members.filter((m) => m.department === selectedDept?.name);

  // 검색 필터링
  const filteredDepartments = departments.filter((dept) =>
    `${dept.name} ${dept.lead} ${dept.description}`.toLowerCase().includes(search.toLowerCase())
  );

  // 통계 계산
  const totalEmployees = departments.reduce((acc, cur) => acc + Number(cur.count || 0), 0);
  const averageCount = departments.length ? Math.round(totalEmployees / departments.length) : 0;

  // 신규 부서 등록 핸들러 (모달 내부에서 호출)
  const handleRegisterDept = (newDeptData) => {
    const newDept = {
      id: Date.now(),
      name: newDeptData.name,
      lead: newDeptData.lead,
      count: 1, // 등록된 부서장 1명 기본 반영
      description: newDeptData.description
    };

    setDepartments((prev) => [...prev, newDept]);
    // 신규 부서장 멤버 추가
    setMembers((prev) => [
      ...prev,
      {
        id: `EMP-${Date.now().toString().slice(-4)}`,
        name: newDeptData.lead,
        department: newDeptData.name,
        position: '팀장',
        email: `${newDeptData.lead}@enova.co.kr`,
        status: '재직'
      }
    ]);

    setSelectedDeptId(newDept.id);
    setIsModalOpen(false);
    alert(`'${newDept.name}' 부서가 등록되었습니다.`);
  };

  return (
    <div className="sub-container">
      {/* 1. 상단 공통 헤더 */}
      <header className="dashboard-header">
        <div>
          <span className="subtitle">부서관리</span>
          <span className="subtext">부서를 선택하여 조직 구조와 소속 인원을 확인합니다.</span>
        </div>
        <div className="dashboard-top">
          {(
            <button
              className="register-btn"
              onClick={() => setIsModalOpen(true)}
            >
              부서 등록
            </button>
          )}
        </div>
      </header>

      {/* 2. 상단 통계 카드 */}
      <section className="stats-section">
        <StatisticsCard title="전체부서" count={String(departments.length)} stiyle={0} />
        <StatisticsCard title="총 구성원" count={String(totalEmployees)} stiyle={1} />
        <StatisticsCard title="평균부서인원" count={String(averageCount)} stiyle={1} />
      </section>

      {/* 3. 모달 팝업 연결 */}
      {isModalOpen && (
        <ModalBase
          title= {"신규 부서 등록"}
          onClose={() => setIsModalOpen(false)}
          layout={
            <DepartmentRegisterForm
              onRegister={handleRegisterDept}
              onCancel={() => setIsModalOpen(false)}
            />
          }
        />
      )}

      {/* 4. 부서 검색바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px 0' }}>
        <div style={{ fontSize: '14px', color: '#475569' }}>
          운용 부서 <strong>{filteredDepartments.length}</strong>개
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="부서명, 부서장 검색"
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            width: '220px'
          }}
        />
      </div>

      {/* 5. [좌측: 부서 카드 목록] / [우측: 선택된 부서 구성원 상세] 2분할 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* [좌측] 부서 카드 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDepartments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                style={{
                  backgroundColor: '#ffffff',
                  border: isSelected ? '2px solid var(--color-brand, #3b82f6)' : '1px solid var(--color-line, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease-in-out',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                    {dept.name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#eff6ff' : '#f1f5f9',
                    color: isSelected ? '#2563eb' : '#64748b'
                  }}>
                    {dept.count}명
                  </span>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                  {dept.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f8fafc', paddingTop: '8px' }}>
                  <span>부서장: <strong style={{ color: '#334155' }}>{dept.lead}</strong></span>
                  <span style={{ color: isSelected ? '#3b82f6' : 'transparent', fontWeight: '600' }}>선택됨 ▸</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* [우측] 선택된 부서의 소속 인원 상세 패널 */}
        <div className="attendance-card" style={{ maxWidth: '100%', margin: 0, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <span className="attendance-badge">{selectedDept?.name}</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', color: '#0f172a' }}>
                소속 임직원 현황
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
              부서장: <strong style={{ color: '#0f172a' }}>{selectedDept?.lead}</strong>
            </div>
          </div>

          {/* 소속 임직원 목록 테이블 */}
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>사번</th>
                  <th>이름</th>
                  <th>직급</th>
                  <th>이메일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {currentMembers.length > 0 ? (
                  currentMembers.map((member) => (
                    <tr key={member.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{member.id}</td>
                      <td>
                        <strong className="emp-name">{member.name}</strong>
                        {member.name === selectedDept?.lead && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '1px 5px', borderRadius: '4px' }}>
                            부서장
                          </span>
                        )}
                      </td>
                      <td className="emp-position">{member.position}</td>
                      <td>{member.email}</td>
                      <td>
                        <span className={`status-tag ${member.status === '재직' ? 'working' : 'off'}`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                      해당 부서에 배정된 직원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}