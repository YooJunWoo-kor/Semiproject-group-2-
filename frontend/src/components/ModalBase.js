import React from "react";

function ModalBase({ onClose, title, layout, className = '' }) {
    title = title == null ? '타이틀자리': title;
    return (
      // 배경 어둡게 처리 (오버레이)
      <div onClick={onClose} className='modal-back'>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`modal-boder ${className}`.trim()}
        >
          <div className='modal-header' style={{ }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
            <button type="button" onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '16px' }}>
              ✕
            </button>
          </div>
          
          <div className='modal-body'>
            {layout}
          </div>
        </div>
      </div>
    );
  }

export default ModalBase;
