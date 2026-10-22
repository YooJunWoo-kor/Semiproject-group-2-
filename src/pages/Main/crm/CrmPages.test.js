import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MainApp from '../MainApp';

function renderMain(path = '/main/crm') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/main/*" element={<MainApp />} />
      </Routes>
    </MemoryRouter>
  );
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => localStorage.clear());

test('CRM data is connected and remains in localStorage', () => {
  const view = renderMain();

  fireEvent.click(screen.getByRole('link', { name: /고객 관리/ }));
  fill('이름 *', '김고객');
  fill('연락처 *', '010-1234-5678');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  fireEvent.click(screen.getByRole('link', { name: '김고객' }));

  fill('구매일 *', '2026-10-22');
  fill('제품명 *', '수분 크림');
  fill('수량 *', '2');
  fill('결제금액 *', '50000');
  fill('구매처 *', '공식몰');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  fireEvent.click(screen.getByRole('link', { name: '고객관리' }));
  fireEvent.click(screen.getByRole('link', { name: /상담 관리/ }));
  fill('고객 *', screen.getByRole('option', { name: /김고객/ }).value);
  fill('문의 내용 *', '사용 순서 문의');
  fill('답변', '토너 다음에 사용하세요.');
  fill('상태', '답변 완료');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  fireEvent.click(screen.getByRole('link', { name: '고객관리' }));
  fireEvent.click(screen.getByRole('link', { name: /클레임 관리/ }));
  fill('고객 *', screen.getByRole('option', { name: /김고객/ }).value);
  fill('구매 건 *', screen.getByRole('option', { name: /수분 크림/ }).value);
  fill('클레임 내용 *', '용기 펌프 불량');
  fill('처리 내용', '새 제품 교환');
  fill('상태', '처리 완료');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  view.unmount();
  renderMain('/main/crm/customers');
  expect(screen.getByRole('link', { name: '김고객' })).toBeInTheDocument();

  const saved = JSON.parse(localStorage.getItem('cosmetics-erp-crm'));
  expect(saved.purchases[0].customerId).toBe(saved.customers[0].id);
  expect(saved.claims[0].purchaseId).toBe(saved.purchases[0].id);
});
