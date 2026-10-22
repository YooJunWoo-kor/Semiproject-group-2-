import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ERP login screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /ERP 시스템/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
});
