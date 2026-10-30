
import React from 'react';
import { useNavigate } from 'react-router-dom';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import StatisticsCard from '../../../components/StatisticsCard';

function ScheduleModul() {
    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className="subtitle">일정관리</span>
                <div className="dashboard-top">
                    <button
                        type="button"
                        className="register-btn"
                        onClick={() => alert('신규 계좌 등록 폼 열기')}
                    >
                        + 일정 등록
                    </button>
                </div>
            </header>

            <section className="stats-section">
                <StatisticsCard title={"마감임박"} count={"5"}/>
                <StatisticsCard title={"주요일정"} count={"5"}/>
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
        </div>
    );
}

export default ScheduleModul;
