import React, { useEffect, useState } from 'react';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import { API_BASE_URL, formatDateToYYYYMMDD } from '../../../utils/authStorage'
import ModalBase from '../../../components/ModalBase'
import ProjectListModule from './page/ProjectListModule'
import axios from 'axios';
import SetNewProjectLayout from './page/SetNewProjectLayout';
import ProjectDetail from './page/ProjectDetail';

//프로젝트 데시보드
export default function ProjectModul() {
  const[projectData, setProjectData] = useState([]);
  const getProjectData = async function(){
    try{
        let data = await axios.get(API_BASE_URL + '/project/getproject')
        for(let i = 0; i < data.data.data.length; i++){
          data.data.data[i].start = formatDateToYYYYMMDD(data.data.data[i].start);
          data.data.data[i].end = formatDateToYYYYMMDD(data.data.data[i].end);
        }
        console.log(data.data.data);
        setProjectData(data.data.data);
    }catch(err){
        alert('데이터 조회 실패', err.data.massage);
    }
  }

  useEffect(()=>{
    getProjectData();
  },[]);

  //프로젝트 등록을 위한 모달
  const [isModal, setIsModal] = useState(0);
  //프로젝트 등록 모달 오픈
  const oppenModal = function(){setIsModal(1)};
  //프로젝트 등록 모달 클로즈
  const clossModal = function(){setIsModal(0)};

  //프로젝트 상세보기 모달관련
  const [isProjectDetail, setIsProjectDetail] = useState(false);
  const [currontProjectIndex, setCurrontProjectIndex] = useState();
  
  const selectProject = (projectID)=>{
    setIsProjectDetail(true);
    setCurrontProjectIndex(projectID);
  }

  let selectData;
  let selectProjectTitle;
  if(isProjectDetail){
    selectData = projectData.filter((item)=>{
      return item.project_id == currontProjectIndex;
    });
    selectProjectTitle = selectData[0].project_name;
  }

  return (
    <div className="border-container">
      <header className="dashboard-header">
          <span className='subtitle'>프로젝트 관리</span>
          <div className="dashboard-top">
                    {
                      <button
                          className="register-btn"
                          onClick = {oppenModal}
                      >
                          + 프로젝트 등록
                      </button>
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
          <div style={{overflowY:'scroll', maxHeight:'600px', display: 'flex', flexFlow: 'column', flex:'1', gap: '10px'}}>
            {projectData.map((item, index)=>{
              return <ProjectListModule key={index}
                data={item}
                buttonClick={selectProject}
              />
            })}
          </div>
          
        </div>
        <div style={{ flex: '1'}}>
            <BasicCalendar schedule={projectData}/>
        </div>
      </div>
      {isModal ?
        <ModalBase onClose={clossModal} title={'프로젝트 등록'}
        layout ={<SetNewProjectLayout setIsModal={clossModal}/>}/> : null}
      { isProjectDetail ?
        <ModalBase title={selectProjectTitle}
          layout={<ProjectDetail project = {selectData[0]}/>}
        /> : null}
    </div>
  );
}



