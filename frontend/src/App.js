import './App.css';
import './css/Solution.css';
import Home from './pages/Home';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import MainApp from './pages/Main/MainApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/main/*" element={<MainApp />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/main" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
