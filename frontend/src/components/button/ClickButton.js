import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClickButton({ image, text, link }) {
    const navigate = useNavigate();

    // 버튼 클릭 시 전달받은 경로로 이동
    function handleClick() {
        if (!link) return;

        navigate(link);
    }

    return (
        <button type="button" onClick={handleClick}>
            {/* 상단 이미지 */}
            {image && (
                <>
                    <img src={image} alt="" />
                    <br />
                </>
            )}

            {/* 하단 텍스트 */}
            <span>{text}</span>
        </button>
    );
}