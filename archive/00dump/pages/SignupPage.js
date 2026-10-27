import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // 현재는 가입 데이터를 저장하지 않습니다. 추후 백엔드 회원가입 API를 연결합니다.
    alert("회원가입 API가 아직 연결되지 않았습니다.");
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark auth-mark">W</div>
        <div className="brand auth-brand">WORK<span>FLOW</span></div>
        <p className="auth-caption">사내 업무 시스템</p>
        <h1>회원가입</h1>
        <p className="auth-description">업무 시스템 계정을 만들어 보세요.</p>
        <label htmlFor="signup-name">이름</label>
        <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 입력" required />
        <label htmlFor="signup-email">이메일</label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
        <label htmlFor="signup-password">비밀번호</label>
        <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" required />
        <button className="btn btn-primary auth-submit" type="submit">가입하기</button>
        <p className="auth-footer">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
      </form>
    </div>
  );
}
