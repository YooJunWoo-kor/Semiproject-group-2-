import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatisticsCard from '../../../components/StatisticsCard';
import Nav from '../../../components/Nav';

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
          <span className='subtitle'>품질보증 관리</span>
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
      </section>
    </div>
  );
}
