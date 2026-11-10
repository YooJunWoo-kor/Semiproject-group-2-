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
    <div className="border-container">
      <header className="dashboard-header">
          <span className='subtitle'>프로젝트 관리</span>
          <div className="dashboard-top">
                    {
                      <Link
                          to="/main/hr/employees"
                          className="register-btn"
                      >
                          + 프로젝트 등록
                      </Link>
                    }
                 </div>
      </header>
      <div style={{display:'flex', gap: '30px'}}>
        <div style={{flex:'1', display: 'flex', flexFlow:'column', overflowY: 'scroll'}}>
          <div className='boder' style={{display:'flex', flexFlow:'column', height: '150px', padding: '20px 30px', marginRight: '30px'}}>
              <div>
                <p>완료태그</p>
              </div>
              <div style={{display:'flex'}}>
                <div>
                  <h2>dd</h2>
                  <p>날짜</p>
                </div>
                <div>
                  <div>상태태그</div>
                  <button>버튼</button>
                </div>
              </div>
          </div>
          
        </div>
        <div style={{
          flex: '1',
        }}>
            <BasicCalendar schedule={projectlist}/>
        </div>

      </div>
      
    </div>
  );
}
