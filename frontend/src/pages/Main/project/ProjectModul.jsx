import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import { API_BASE_URL } from '../../../utils/authStorage'
import axios from 'axios';

export default function ProjectModul({projectlist}) {

  const projectData = async function(){
    try{
        const data = await axios.get(API_BASE_URL + '/project/getproject')
        console.log(data.data);
    }catch(err){
        alert('데이터 조회 실패', err.data.massage);
    }
  }

  useEffect(()=>{
    projectData();
  },[]);

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
        <div style={{flex:'1', display: 'flex', flexFlow:'column'}}>
          <div style={{fontSize:'13px'}}>
            <select style={{width:'150px', marginBottom:'20px'}}>
              <option>전체보기</option>
              <option>시작날짜순</option>
              <option>완료날짜</option>
            </select>
          </div>
          <div style={{overflowY:'scroll', display: 'flex', flexFlow: 'column', flex:'1'}}>
            //프로젝트 폼 생성중
            <div className='boder' style={{display:'flex', flexFlow:'column', height: '200px', padding: '20px 30px', marginRight: '30px'}}>
                <div>
                  <p className='attendance-tag tag-emerald'>완료태그</p>
                </div>
                <div style={{display:'flex'}}>
                  <div>
                    <h3>프로젝트 명</h3>
                    <p style = {{fontSize : '13px'}}>2024-12-25</p>
                  </div>
                  <div style={{marginLeft:'auto', display:'flex', flexFlow:'column', gap:'5px'}}>
                    <div className='attendance-tag tag-emerald'>상태태그</div>
                    <button style = {{fontSize:'15px'}}>버튼</button>
                  </div>
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
