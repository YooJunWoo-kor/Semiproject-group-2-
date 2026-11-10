import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import { API_BASE_URL, formatDateToYYYYMMDD } from '../../../utils/authStorage'
import ModalBase from '../../../components/ModalBase'
import axios from 'axios';

export default function ProjectModul({projectlist}) {

  const[projectData, setProjectData] = useState([]);

  const getProjectData = async function(){
    try{
        let data = await axios.get(API_BASE_URL + '/project/getproject')
        for(let i = 0; i < data.data.data.length; i++){
          data.data.data[i].start = formatDateToYYYYMMDD(data.data.data[i].start);
          data.data.data[i].end = formatDateToYYYYMMDD(data.data.data[i].end);
        }
        setProjectData(data.data.data);
    }catch(err){
        alert('데이터 조회 실패', err.data.massage);
    }
  }

  useEffect(()=>{
    getProjectData();
  },[]);

  const [isModal, setIsModal] = useState(0);
  const oppenModal = function(){
    setIsModal(1)
  };
  const clossModal = function(){setIsModal(0)};

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
          <div style={{overflowY:'scroll', display: 'flex', flexFlow: 'column', flex:'1', gap: '10px'}}>
            {projectData.map((item, index)=>{
              return <ProjectListModule key={index} data={item} buttonClick={oppenModal}/>
            })}
          </div>
          
        </div>
        <div style={{ flex: '1'}}>
            <BasicCalendar schedule={projectlist}/>
        </div>
      </div>
      {isModal ? <ModalBase onClose={clossModal} title={'제목'} layout/> : null}
    </div>
  );
}

function ProjectListModule({data, buttonClick}){
  return (
    <div className='boder' style={{display:'flex', flexFlow:'column', height: '200px', padding: '20px 30px', marginRight: '30px'}}>
      <div>
        <p className='attendance-tag tag-emerald'>완료태그</p>
      </div>
      <div style={{display:'flex'}}>
        <div>
          <h3>{data.project_name}</h3>
          <div style={{display:'flex', gap: '15px'}}>
            <p style = {{fontSize : '13px'}}>시작일: {data.start}</p>
            <p style = {{fontSize : '13px'}}>종료일: {data.end}</p>
          </div>
        </div>
        <div style={{marginLeft:'auto', display:'flex', flexFlow:'column', gap:'5px'}}>
          <div className='attendance-tag tag-emerald'>상태태그</div>
          <button
            style = {{fontSize:'15px'}}
            onClick={buttonClick}
          >상세보기</button>
        </div>
      </div>
    </div>
  )
}