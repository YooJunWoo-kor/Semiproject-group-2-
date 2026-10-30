import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainLinkButton({ image, icon, text, link }) {
  const navigate = useNavigate();

  function handleClick() {
    if (!link) return;
    navigate(link);
  }

  return (
    <button type="button" className="main-card" onClick={handleClick}>
      {/* 1. Lucide React 등의 아이콘 컴포넌트가 전달된 경우 */}
      {icon && <div className="link-icon-wrapper">{icon}</div>}

      {/* 2. 기존 SVG/PNG 이미지 경로(string)가 전달된 경우 */}
      {!icon && image && (
        <div className="link-image-wrapper">
          <img src={image} alt={text || ""} />
        </div>
      )}

      {/* 하단 텍스트 */}
      <span className="link-title">{text}</span>
    </button>
  );
}