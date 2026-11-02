import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // 현재는 화면 이동만 하는 임시 로그인입니다. 추후 백엔드 API 연동 위치입니다.
    navigate("/schedule");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark auth-mark">W</div>
        <div className="brand auth-brand">WORK<span>FLOW</span></div>
        <p className="auth-caption">사내 업무 시스템</p>
        <h1>로그인</h1>
        <p className="auth-description">계정에 로그인해 업무 일정을 관리하세요.</p>
        <label htmlFor="login-email">이메일</label>
        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
        <label htmlFor="login-password">비밀번호</label>
        <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" required />
        <button className="btn btn-primary auth-submit" type="submit">로그인</button>
        <p className="auth-footer">계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
        <small className="auth-notice">현재는 화면 확인용이며 실제 인증은 연결되지 않았습니다.</small>
      </form>
    </div>
  );
}
