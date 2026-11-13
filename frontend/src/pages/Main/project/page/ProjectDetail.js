import React, { useEffect, useState } from "react";

import ProjectProgress from '../../../../components/ProjectProgress';
import ProjectWorkDetail from './ProjectWorkDetail';
import ProjectDetailWorkList from './ProjectDetailWorkList';
import ProjectStatusTage from "../../../../components/ProjectStatusTage";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";
import NewWorkList from "./NewWorkList";

// 프로젝트 세부
function ProjectDetail({ project, onClose }) {
    const [bodyStyle, setBodyStyle] = useState(0);
    const [selectTask, setSelectTask] = useState(0);
  
    // 프로젝트 전환 시 선택된 할 일 초기화 (해당 프로젝트의 첫 할 일이 있으면 선택, 없으면 null)
    // 신규 할 일 등록
    const [leader, setleader] = useState('');
    const [member, setMember] = useState([]);

    const getLeader = async()=>{
      let data = await axios.post(
        API_BASE_URL+'/project/get_employee',
        {employee_id : project.employee_id}
      );

      let getProjectMember = await axios.post(
        API_BASE_URL+'/project/get_project_member',
        {projectID: project.project_id}
      );

      setleader( data.data.data[0]);
      setMember( getProjectMember.data.data );
    }

    useEffect(()=>{
      getLeader()
    },[]);

    return (
      <div>
        <header className="horizontal-box" style={{marginBottom:'20px', marginTop:'10px'}}>
          <div>
            {/* 스케쥴 상태 스테이터스 */}
            <ProjectStatusTage start={project.start} end={project.end}/>
          </div>
          {/* 진행바 모듈 */}
          <div style={{display:'flex', flex: '1'}}>
            <ProjectProgress start={project.start} end={project.end}/>
          </div>
          
        </header>
  
        <div style={{ display: "flex", flexFlow:'column',gap: "20px" }}>
          
          {/* 참여인원 */}
          <section className="vertical-box boder" style={{padding:"20px"}}>
            <div className="horizontal-box">
              <strong style={{width:'70px'}}> 담당자 </strong>
              <MemberLayout member={leader}/>
            </div>
            <div className="horizontal-box">
              <strong style={{width:'70px'}}>참여자 ({member?.length || 0})</strong>
              <div style={{ display: "flex", gap: "5px" }}>
                {member &&
                  member.map((member, index) => (
                    <MemberLayout key={index} member={member}/>
                  ))}
              </div>
            </div>
          </section>
          <section
            style={{
              display: 'flex',
              flexFlow: 'column',
              minWidth: 0,
              height:'500px'
            }}
          >
            <div style={{display:'flex', gap:'5px', marginBottom:"30px"}}>
              <button
                style={{ fontSize: "13px",  marginLeft:'auto'}}
                onClick={()=>{
                  setBodyStyle(0);
                }}
              >할 일 리스트</button>
              
              <button
                type="button"
                className="register-btn"
                style={{ fontSize: "13px"}}
                onClick={()=>{
                  setBodyStyle(2);
                }}
              >
                + 할 일 추가
              </button>
            </div>
            <div>
              {
                bodyStyle == 0 ?
                <ProjectDetailWorkList
                  projectID = {project.project_id}
                  click = {(index)=>{
                    setBodyStyle(1);
                    setSelectTask(index);
                  }}
                />:
                bodyStyle == 1 ?
                <ProjectWorkDetail
                  projectID={selectTask}
                />:
                <NewWorkList />
              }
            </div>
          </section>
  
          <div style={{display: 'flex'}}>
            <button
              style={{
                marginLeft:'auto'
              }}
            > 닫기</button>
          </div>
        </div>
      </div>
    );
  }
  
  function MemberLayout({member}){
    return(
      <div
        key={member.id}
        className="attendee-tag"
      >
        <strong style={{ fontSize: "14px" }}>{member.name}</strong>
        <span style={{ fontSize: "12px", marginTop: "2px", paddingRight: "5px"}}>
          {member.position}
        </span>
      </div>
    );
  }

export default ProjectDetail;