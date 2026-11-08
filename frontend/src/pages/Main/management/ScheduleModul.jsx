import React, { useEffect, useState } from 'react';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import StatisticsCard from '../../../components/StatisticsCard';
import ModalBase from '../../../components/ModalBase'
import ScheduleModalPopup from './ScheduleModalPopup';

function ScheduleModul() {
    //모달팝업용
    const [isModal, setisModal] = useState(false);
    const openModal = ()=> setisModal(true);
    const closeModal = ()=> setisModal(false);

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">일정관리</span>
                <div className="dashboard-top">
                    <button
                        type="button"
                        className="register-btn"
                        onClick={() =>{openModal()}}
                    >
                        + 일정 등록
                    </button>
                </div>
            </header>

            <section className="stats-section">
                <StatisticsCard title={"마감임박"} count={"5"} stiyle={0}/>
                <StatisticsCard title={"주요일정"} count={"5"} stiyle={0}/>
            </section>
            <div style={{
                display: "flex",
                gap: '30px'
                }}>
                <div style={{ flex: '0.5' }}>
                    <BasicCalendar />
                </div>
                <div style={{ flex: '0.5' }} >
                    <WeeklyCalendar />
                </div>
            </div>
            
            {/* onClose, title, layout */}
            {isModal ? <ModalBase onClose={closeModal} title={"일정 등록"}
              layout={<ScheduleModalPopup
                onClose={closeModal}
              />}/>: <div></div>}
        </div>
    );
}

export default ScheduleModul;