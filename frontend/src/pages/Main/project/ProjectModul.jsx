import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatisticsCard from '../../../components/StatisticsCard';
import Nav from '../../../components/Nav';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';

/*
프로잭트 갯수
프로젝트타이틀
완료된 프로젝트
*/

/*
프로젝트 생성
등록된 프로젝트 숫자
*/

export default function ProjectModul({projectlist}) {
  

  return (
    <div className="sub-container">
      <header className="dashboard-header">
          <span className='subtitle'>프로젝트 관리</span>
          <div className="dashboard-top">
                    {/* MASTER에게만 표시 */}
                    {(
                        <Link
                            to="/main/hr/employees"
                            className="register-btn"
                        >
                            프로젝트 등록
                        </Link>
                    )}
                 </div>
      </header>
      <section className="stats-section">
        <StatisticsCard title="등록된 프로젝트" count={projectlist.length}/>
        <StatisticsCard title="내 프로젝트" count={3}/>
        <StatisticsCard title="이번달" count={5}/>
        <StatisticsCard title="이번주" count={projectlist.length}/>
      </section>
      
      <div style={{
        display: "flex",
        gap: '30px'
      }}>
        <div style={{
          flex: '0.5'
        }}>
          <BasicCalendar schedule={projectlist}/>
        </div>
        <div style={{
          flex: '0.5'
        }} >
          <WeeklyCalendar schedule={projectlist}/>
        </div>
      </div>
    </div>
  );
}
