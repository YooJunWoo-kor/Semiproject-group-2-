import React from "react";

import ProjectProgress from '../../../../components/ProjectProgress';
import ProjectWorkDetail from './ProjectWorkDetail';
import ProjectDetailWorkList from './ProjectDetailWorkList';
import ColorTeg from '../../../../components/ColorTeg';

// 프로젝트 세부
function ProjectDetail({ project }) {
    const tasks = project.tasks || [];
  
    // 프로젝트 전환 시 선택된 할 일 초기화 (해당 프로젝트의 첫 할 일이 있으면 선택, 없으면 null)
    
  
    // 신규 할 일 등록
    const handleCreateTask = () => {
      
    };
  
    const test = {id:0, name: '담당자명'};
  
    return (
      <div className="border-container">
        
        <header className="dashboard-header">
          <div style={{display: 'flex'}}>
            <span className="subtitle">{project.title}</span>
            <div>
              <ColorTeg title={'진행사항'} count={'50'} type={'%'}/>
            </div>
          </div>
          {/* 진행바 모듈 */}
          <div style={{display:'flex', flex: '1', margin:'0 30px'}}>
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
  
        <div style={{ display: "flex", flexFlow:'column',gap: "20px", minHeight: "480px" }}>
          
          {/* 참여인원 */}
          <section
            style={{
              display:'flex',
              alignItems: "center",
              gap: "10px"
            }}
          >
            <div style={{display:'flex',fontSize: "15px", fontWeight:'500px'}}>
              <strong>담당자</strong>
            </div>
            <MemberLayout member={test}/>
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
              paddingRight: "16px",
              minWidth: 0,
            }}
          >
            <ProjectDetailWorkList tasks={tasks} project = {project}/>
            <ProjectWorkDetail tasks={tasks}/>
          </section>
  
          
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