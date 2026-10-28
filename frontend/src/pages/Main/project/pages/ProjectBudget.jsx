import React, { useState } from 'react';
import { useProject } from '../ProjectContext';

export default function ProjectBudget() {
  const {
    projects,
    budgets,
    expenses,
    saveBudget,
    addExpense,
    removeExpense
  } = useProject();

  const [projectId, setProjectId] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [category, setCategory] = useState('패키지비');
  const [amount, setAmount] = useState('');

  const selectedProjectId = projectId ? Number(projectId) : null;
  const budget = selectedProjectId === null
    ? 0
    : Number(budgets[selectedProjectId] || 0);

  const items = selectedProjectId === null
    ? []
    : expenses.filter(expense =>
        Number(expense.projectId) === Number(selectedProjectId)
      );

  const used = items.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const remaining = budget - used;
  const rate = budget > 0
    ? Math.round((used / budget) * 100)
    : 0;

  const hasBudget = selectedProjectId !== null &&
    Object.prototype.hasOwnProperty.call(budgets, selectedProjectId);

  const isOverBudget = hasBudget && used > budget;
  const hasUnbudgetedExpense = !hasBudget && used > 0;

  function handleSaveBudget(e) {
    e.preventDefault();

    if (selectedProjectId === null || budgetInput === '' || Number(budgetInput) < 0) {
      return;
    }

    saveBudget(selectedProjectId, budgetInput);
    setBudgetInput('');
  }

  function handleAddExpense(e) {
    e.preventDefault();

    if (selectedProjectId === null || !category || Number(amount) <= 0) {
      return;
    }

    addExpense({
      projectId: selectedProjectId,
      category,
      amount
    });

    setAmount('');
  }

  return (
    <div>
      <h2>예산 · 비용 관리</h2>

      <select
        value={projectId}
        onChange={e => {
          setProjectId(e.target.value);
          setBudgetInput('');
        }}
      >
        <option value="">프로젝트 선택</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {selectedProjectId !== null && (
        <>
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
                <td style={{ color: remaining < 0 ? 'red' : 'inherit' }}>
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

          {(isOverBudget || hasUnbudgetedExpense) && (
            <p style={{ color: 'red', fontWeight: 'bold' }}>
              {hasUnbudgetedExpense
                ? `⚠️ 예산이 설정되지 않았지만 ${used.toLocaleString()}원이 지출되었습니다.`
                : `⚠️ 예산이 ${Math.abs(remaining).toLocaleString()}원 초과되었습니다.`}
            </p>
          )}

          <form onSubmit={handleSaveBudget}>
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

          <form onSubmit={handleAddExpense}>
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
                  <td colSpan={3}>등록된 비용 내역이 없습니다.</td>
                </tr>
              ) : (
                items.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.category}</td>
                    <td>{Number(expense.amount).toLocaleString()}원</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeExpense(expense.id)}
                      >
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
