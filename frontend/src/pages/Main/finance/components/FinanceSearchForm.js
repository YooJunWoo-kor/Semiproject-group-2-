//재무 공통 UI: 계좌·카드·결재의 검색 폼.
import React from 'react';

export default function FinanceSearchForm({ filters = [], keyword, onSubmit, className = 'finance-card-search' }) {
  return <form className={className} onSubmit={onSubmit}>
    {filters.map(filter => <React.Fragment key={filter.id}>
      <label htmlFor={filter.id}>{filter.label}</label>
      <select id={filter.id} value={filter.value} onChange={event => filter.onChange(event.target.value)}>
        {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </React.Fragment>)}
    {keyword && <>
      <label htmlFor={keyword.id}>검색: </label>
      <input id={keyword.id} type="text" placeholder={keyword.placeholder} value={keyword.value} onChange={event => keyword.onChange(event.target.value)} />
    </>}
    <button type="submit">조회</button>
  </form>;
}
