import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectModul from './ProjectModul';
import Nav from '../../../components/Nav';

import ProjectDetail from './page/ProjectDetail';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/authStorage';

//프로젝트 라우터 관리
function ProjectHome() {
  const mainUrl = "/main/project/";
  const urlList = [
    { name: "프로젝트 대시보드", url: mainUrl }
  ];

  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} title={'프로젝트'}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route index element={<ProjectModul/>} />
        </Routes>
      </div>
    </div>
  );
}



export default ProjectHome;
