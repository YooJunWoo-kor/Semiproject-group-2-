import React, { useEffect, useState } from "react";

import ProjectProgress from '../../../../components/ProjectProgress';
import ProjectWorkDetail from './ProjectWorkDetail';
import ProjectDetailWorkList from './ProjectDetailWorkList';
import ProjectStatusTage from "../../../../components/ProjectStatusTage";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";

// 프로젝트 세부
function ProjectDetail({ project, onClose }) {
    const tasks = project.tasks || [];
    const [bodyStyle, setBodyStyle] = useState(0);
  
    // 프로젝트 전환 시 선택된 할 일 초기화 (해당 프로젝트의 첫 할 일이 있으면 선택, 없으면 null)
    // 신규 할 일 등록
    const handleCreateTask = () => {
    };

    const [leader, setleader] = useState('');
  
    const getLeader = async()=>{
      let data = await axios.post(
        API_BASE_URL+'/project/get_employee',
        {employee_id : project.employee_id}
      );
      setleader(data.data.data[0]);
    }

    useEffect(()=>{
      getLeader()
    },[]);

    return (
      <div>
        <hr/>
        <header style={{display: 'flex', gap:'20px', marginBottom:'20px', marginTop:'20px'}}>
          <div>
            {/* 스케쥴 상태 스테이터스 */}
            <ProjectStatusTage start={project.start} end={project.end}/>
          </div>
          {/* 진행바 모듈 */}
          <div style={{display:'flex', flex: '1'}}>
            <ProjectProgress start={project.start} end={project.end}/>
          </div>
          <button
            type="button"
            className="register-btn"
            style={{ fontSize: "12px", marginLeft:'auto'}}
            onClick={handleCreateTask}
          >
            + 할 일 추가
          </button>
        </header>
  
        <div style={{ display: "flex", flexFlow:'column',gap: "20px" }}>
          
          {/* 참여인원 */}
          <section
            style={{
              display:'flex',
              alignItems: "center",
              gap: "10px"
            }}
          >
            <strong> 담당자 </strong>
            <MemberLayout member={leader}/>
            <div style={{display:'flex',fontSize: "15px", fontWeight:'500px'}}>
              <strong>참여자 ({project.members?.length || 0})</strong>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {project.members &&
                project.members.map((member) => (
                  <MemberLayout member={member}/>
                ))}
            </div>
            
          </section>
  
          <section
            style={{
              display: 'flex',
              flexFlow: 'column',
              paddingRight: "16px",
              minWidth: 0,
            }}
          >
            <div style={{display:'flex', gap:'5px', marginBottom:"30px"}}>
              <button
                style={{ fontSize: "13px"}}
                onClick={()=>{
                  setBodyStyle(0);
                }}
              >할 일 리스트</button>
              <button
                style={{ fontSize: "13px"}}
                onClick={()=>{
                  setBodyStyle(1);
                }}
              >할 일 상세</button>
            </div>
              {bodyStyle == 0 ?
                <ProjectDetailWorkList tasks={tasks} project = {project}/>
                :<ProjectWorkDetail tasks={tasks}/>}
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
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "100px",
          minHeight: "auto",
          padding: "10px 12px",
          gap: '5px',
          backgroundColor:'#fff',
          borderRadius: '30px',
        }}
      >
        <strong style={{ fontSize: "14px" }}>{member.name}</strong>
        <span className="subtext" style={{ fontSize: "12px", marginTop: "2px" }}>
          {member.position}
        </span>
      </div>
    );
  }

export default ProjectDetail;