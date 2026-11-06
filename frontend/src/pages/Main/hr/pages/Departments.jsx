import React, { useEffect, useState } from "react";
import StatisticsCard from "../../../../components/StatisticsCard";
import ModalBase from "../../../../components/ModalBase";
import { getLoginUser } from "../../../../utils/authStorage";
import {
  filterHrEmployeesByDepartment,
  getHrOrganization
} from "../../../../components/HrData";

function DepartmentRegisterForm({ onRegister, onCancel }) {
  const [form, setForm] = useState({ name: "", lead: "", description: "" });

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.lead.trim()) {
      alert("부서명과 부서장을 모두 입력해 주세요.");
      return;
    }

    onRegister(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div>
        <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
          부서명
        </label>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="예: 플랫폼개발팀"
          required
          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
          부서장 이름
        </label>
        <input
          value={form.lead}
          onChange={(event) => setForm({ ...form, lead: event.target.value })}
          placeholder="예: 김민준"
          required
          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
          부서 업무 설명
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", resize: "none" }}
        />
      </div>
      <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <button type="button" onClick={onCancel}>취소</button>
        <button type="submit" className="erp-primary-button">등록 완료</button>
      </div>
    </form>
  );
}

function normalizeDepartments(departmentRows, employeeRows) {
  // 부서 API와 직원 API를 합쳐 화면에 필요한 부서별 인원수를 만듭니다.
  return departmentRows.map((department) => {
    const departmentMembers = employeeRows.filter(
      (employee) =>
        String(employee.departmentId) === String(department.departmentId)
    );

    return {
      id: department.departmentId,
      name: department.departmentName,
      lead: "-",
      count: departmentMembers.length,
      description: "DB 부서 정보"
    };
  });
}

export default function Departments() {
  const loginUser = getLoginUser();
  // 현재 부서 등록 UI는 기존 정책대로 MASTER 사용자에게만 노출합니다.
  const isMaster = loginUser?.role === "MASTER";
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadDepartmentPage() {
    // 부서와 직원을 함께 조회해 부서 카드와 소속 직원 표를 갱신합니다.
    setLoading(true);
    setError("");

    try {
      const [departmentResponse, employeeResponse] = await getHrOrganization();

      if (
        !departmentResponse.data.success ||
        !Array.isArray(departmentResponse.data.data) ||
        !employeeResponse.data.success ||
        !Array.isArray(employeeResponse.data.data)
      ) {
        throw new Error("부서관리 자료 형식이 올바르지 않습니다.");
      }

      const employeeRows = employeeResponse.data.data;
      const departmentRows = normalizeDepartments(
        departmentResponse.data.data,
        employeeRows
      );

      setDepartments(departmentRows);
      setMembers(employeeRows);
      setSelectedDeptId((currentId) => {
        if (departmentRows.some((department) => department.id === currentId)) {
          return currentId;
        }
        return departmentRows[0]?.id || null;
      });
    } catch (requestError) {
      console.error("부서관리 자료 조회 오류:", requestError);
      setDepartments([]);
      setMembers([]);
      setSelectedDeptId(null);
      setError("부서관리 자료를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartmentPage();
  }, []);

  // 선택한 부서 ID를 기준으로 오른쪽 소속 직원 목록을 계산합니다.
  const selectedDept = departments.find(
    (department) => department.id === selectedDeptId
  );
  const currentMembers = filterHrEmployeesByDepartment(
    members,
    selectedDeptId
  );
  const filteredDepartments = departments.filter((department) =>
    `${department.name} ${department.lead} ${department.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const totalEmployees = members.length;
  const averageCount = departments.length
    ? Math.round(totalEmployees / departments.length)
    : 0;

  function handleRegisterDept() {
    // 등록 API가 없으므로 실제 저장 대신 지원되지 않는 기능임을 안내합니다.
    setIsModalOpen(false);
    setNotice("부서 등록 API가 없어 DB 등록은 지원되지 않습니다.");
  }

  return (
    <div className="sub-container">
      <header className="dashboard-header">
        <div>
          <span className="subtitle">부서관리</span>
          <span className="subtext">부서를 선택하여 조직 구조와 소속 인원을 확인합니다.</span>
        </div>
        <div className="dashboard-top">
          {isMaster && (
            <button className="register-btn" onClick={() => setIsModalOpen(true)}>
              부서 등록
            </button>
          )}
        </div>
      </header>

      {isModalOpen && (
        <ModalBase
          title="신규 부서 등록"
          onClose={() => setIsModalOpen(false)}
          layout={
            <DepartmentRegisterForm
              onRegister={handleRegisterDept}
              onCancel={() => setIsModalOpen(false)}
            />
          }
        />
      )}

      <section className="stats-section">
        <StatisticsCard title="전체부서" count={String(departments.length)} stiyle={0} />
        <StatisticsCard title="총 구성원" count={String(totalEmployees)} stiyle={1} />
        <StatisticsCard title="평균부서인원" count={String(averageCount)} stiyle={1} />
      </section>

      {notice && <p role="status" style={{ color: "#047857" }}>{notice}</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px 0" }}>
        <div style={{ fontSize: "14px", color: "#475569" }}>
          운용 부서 <strong>{filteredDepartments.length}</strong>개
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="부서명 검색"
            style={{ padding: "7px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", width: "220px" }}
          />
          <button type="button" onClick={loadDepartmentPage}>새로고침</button>
        </div>
      </div>

      {loading ? (
        <p role="status">부서 정보를 불러오는 중입니다.</p>
      ) : departments.length === 0 ? (
        <p>등록된 부서가 없습니다.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 360px) 1fr", gap: "24px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredDepartments.map((department) => {
              const isSelected = department.id === selectedDeptId;
              return (
                <div
                  key={department.id}
                  onClick={() => setSelectedDeptId(department.id)}
                  style={{ backgroundColor: "#ffffff", border: isSelected ? "2px solid var(--color-brand, #3b82f6)" : "1px solid var(--color-line, #e2e8f0)", borderRadius: "12px", padding: "16px 18px", cursor: "pointer", boxShadow: isSelected ? "0 4px 14px rgba(59, 130, 246, 0.12)" : "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: isSelected ? "#1d4ed8" : "#0f172a" }}>{department.name}</h3>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "12px", backgroundColor: isSelected ? "#eff6ff" : "#f1f5f9", color: isSelected ? "#2563eb" : "#64748b" }}>{department.count}명</span>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b" }}>{department.description}</p>
                  <div style={{ fontSize: "12px", color: "#94a3b8", borderTop: "1px solid #f8fafc", paddingTop: "8px" }}>부서장: <strong style={{ color: "#334155" }}>{department.lead}</strong></div>
                </div>
              );
            })}
          </div>

          <div className="attendance-card" style={{ maxWidth: "100%", margin: 0, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px", marginBottom: "16px" }}>
              <div>
                <span className="attendance-badge">{selectedDept?.name || "부서 미선택"}</span>
                <h2 style={{ margin: "6px 0 0 0", fontSize: "18px", color: "#0f172a" }}>소속 임직원 현황</h2>
              </div>
              <div style={{ textAlign: "right", fontSize: "13px", color: "#64748b" }}>부서 ID: <strong style={{ color: "#0f172a" }}>{selectedDept?.id || "-"}</strong></div>
            </div>
            <div className="table-shell">
              <table>
                <thead><tr><th>사번</th><th>이름</th><th>직급</th><th>이메일</th><th>상태</th></tr></thead>
                <tbody>
                  {currentMembers.length > 0 ? currentMembers.map((member) => (
                    <tr key={member.employeeId}>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: "600" }}>{member.employeeNumber}</td>
                      <td><strong className="emp-name">{member.name}</strong></td>
                      <td className="emp-position">{member.position}</td>
                      <td>{member.email}</td>
                      <td><span className={`status-tag ${member.employmentStatus === "재직" ? "working" : "off"}`}>{member.employmentStatus}</span></td>
                    </tr>
                  )) : <tr><td colSpan={5} style={{ textAlign: "center", padding: "36px 0", color: "#94a3b8" }}>해당 부서에 배정된 직원이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
