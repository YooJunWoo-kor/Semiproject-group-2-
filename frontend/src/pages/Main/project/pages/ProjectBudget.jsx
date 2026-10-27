
import React, { useState } from 'react';

export default function ProjectBudget({
  projects,
  budgets,
  setBudgets,
  expenses,
  setExpenses
}) {
  const [projectId, setProjectId] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [category, setCategory] = useState('패키지비');
  const [amount, setAmount] = useState('');

  const id = Number(projectId);

  // 선택한 프로젝트의 예산
  const budget = Number(budgets[id] || 0);

  // 선택한 프로젝트의 지출 내역
  const items = expenses.filter(
    e => String(e.projectId) === String(id)
  );

  // 총 집행 금액
  const used = items.reduce(
    (sum, e) => sum + Number(e.amount || 0), 0
  );

  // 잔여 예산
  const remaining = budget - used;

  // 집행률
  const rate = budget > 0
    ? Math.round(used / budget * 100)
    : 0;

  // 예산 초과 여부
  const hasBudget = Object.prototype.hasOwnProperty.call(budgets, id);
  const isOverBudget = hasBudget && used > budget;
  const hasUnbudgetedExpense = !hasBudget && used > 0;

  function saveBudget(e) {
    e.preventDefault();

    if (!id || budgetInput === '' || Number(budgetInput) < 0) {
      return;
    }

    setBudgets({
      ...budgets,
      [id]: Number(budgetInput)
    });

    setBudgetInput('');
  }

  function addExpense(e) {
    e.preventDefault();

    if (!id || !category || Number(amount) <= 0) {
      return;
    }

    setExpenses(prev => [
      ...prev,
      {
        id: Date.now(),
        projectId: id,
        category,
        amount: Number(amount)
      }
    ]);
    
    setAmount('');
  }

  function deleteExpense(expenseId) {
    setExpenses(
      expenses.filter(e => e.id !== expenseId)
    );
  }

  return (
    <div>
      <h2>예산 · 비용 관리</h2>

      {/* 프로젝트 선택 */}
      <select
        value={projectId}
        onChange={e => {
          setProjectId(e.target.value);
          setBudgetInput('');
        }}
      >
        <option value="">프로젝트 선택</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {id > 0 && (
        <>
          {/* 예산 현황 테이블 */}
          <h3>예산 현황</h3>

          <table className="project-summary-table">
            <thead>
              <tr>
                <th>총 예산</th>
                <th>집행 금액</th>
                <th>잔여 예산</th>
                <th>집행률</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{budget.toLocaleString()}원</td>
                <td>{used.toLocaleString()}원</td>
                <td style={{
                  color: remaining < 0 ? 'red' : 'inherit'
                }}>
                  {remaining.toLocaleString()}원
                </td>
                <td style={{
                  color: isOverBudget || hasUnbudgetedExpense ? 'red' : 'inherit',
                  fontWeight: isOverBudget || hasUnbudgetedExpense ? 'bold' : 'normal'
                }}>
                  {hasUnbudgetedExpense
                    ? '⚠ 예산 미설정 · 지출 발생'
                    : !hasBudget
                      ? '미설정'
                      : budget === 0
                        ? (used > 0 ? '⚠ 예산 초과' : '0%')
                        : `${rate}%`}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 예산 초과 및 미설정 경고 */}
          {(isOverBudget || hasUnbudgetedExpense) && (
            <p style={{
              color: 'red',
              fontWeight: 'bold'
            }}>
              {hasUnbudgetedExpense
                ? `⚠️ 예산이 설정되지 않았지만 ${used.toLocaleString()}원이 지출되었습니다.`
                : `⚠️ 예산이 ${Math.abs(remaining).toLocaleString()}원 초과되었습니다.`}
            </p>
          )}

          {/* 예산 저장 */}
          <form onSubmit={saveBudget}>
            <input
              type="number"
              min="0"
              placeholder="총 예산"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              required
            />
            <button type="submit">예산 저장</button>
          </form>

          <h3>비용 등록</h3>

          <form onSubmit={addExpense}>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option>패키지비</option>
              <option>원재료비</option>
              <option>인건비</option>
              <option>외주비</option>
              <option>마케팅비</option>
              <option>기타</option>
            </select>

            <input
              type="number"
              min="1"
              placeholder="집행 금액"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />

            <button type="submit">비용 등록</button>
          </form>

          <h3>등록된 비용 내역</h3>

          <table className="project-summary-table">
            <thead>
              <tr>
                <th>비용 항목</th>
                <th>집행 금액</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    등록된 비용 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                items.map(e => (
                  <tr key={e.id}>
                    <td>{e.category}</td>
                    <td>
                      {Number(e.amount).toLocaleString()}원
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteExpense(e.id)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
