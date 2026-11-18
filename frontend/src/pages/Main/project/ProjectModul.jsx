import React, { useEffect, useState } from 'react';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import { API_BASE_URL, formatDateToYYYYMMDD, getTodayString } from '../../../utils/authStorage'; // getTodayString 추가
import ModalBase from '../../../components/ModalBase';
import ProjectListModule from './page/ProjectListModule';
import axios from 'axios';
import SetNewProjectLayout from './page/SetNewProjectLayout';
import ProjectDetail from './page/ProjectDetail';
import ColorTeg from '../../../components/ColorTeg'

// 프로젝트 데시보드
export default function ProjectModul() {
  const [projectData, setProjectData] = useState([]);
  const [filterType, setFilterType] = useState('ALL'); // 필터 상태 추가 ('ALL', 'IN_PROGRESS', 'UPCOMING', 'COMPLETED')

  const getProjectData = async function () {
    try {
      let data = await axios.get(API_BASE_URL + '/project/getproject');
      for (let i = 0; i < data.data.data.length; i++) {
        data.data.data[i].start = formatDateToYYYYMMDD(data.data.data[i].start);
        data.data.data[i].end = formatDateToYYYYMMDD(data.data.data[i].end);
      }
      console.log(data.data.data);
      setProjectData(data.data.data);
    } catch (err) {
      alert('데이터 조회 실패', err.response?.data?.message);
    }
  };

  useEffect(() => {
    getProjectData();
  }, []);

  // 현재 날짜 기준 필터링 ('YYYY-MM-DD' 형식끼리는 문자열 비교로 정확히 비교 가능)
  const today = getTodayString();

  const filteredProjects = projectData.filter((item) => {
    if (filterType === 'IN_PROGRESS') {
      // 시작중(진행중): 시작일이 오늘 이하이고, 종료일이 오늘 이상인 프로젝트
      return item.start <= today && item.end >= today;
    }
    if (filterType === 'UPCOMING') {
      // 시작예정: 시작일이 오늘보다 미래인 프로젝트
      return item.start > today;
    }
    if (filterType === 'COMPLETED') {
      // 완료된것: 종료일이 오늘보다 과거인 프로젝트
      return item.end < today;
    }
    return true; // 'ALL' (전체보기)
  });

  // 프로젝트 등록을 위한 모달
  const [isModal, setIsModal] = useState(0);
  const oppenModal = function () { setIsModal(1); };
  const clossModal = function () {
    setIsModal(0);
    getProjectData();
  };

  // 프로젝트 상세보기 모달 관련
  const [isProjectDetail, setIsProjectDetail] = useState(false);
  const [currontProjectIndex, setCurrontProjectIndex] = useState();

  const selectProject = (projectID) => {
    setIsProjectDetail(true);
    setCurrontProjectIndex(projectID);
  };
  const clossProjectDetail = () => {
    setIsProjectDetail(false);
    getProjectData();
  };

  let selectData;
  let selectProjectTitle;
  if (isProjectDetail) {
    selectData = projectData.filter((item) => {
      return item.project_id == currontProjectIndex;
    });
    selectProjectTitle = selectData[0]?.schedule_name;
  }

  //ColorTeg에 전달할 현재 선택된 상태 및 개수 객체 (ScheduleModul과 동일 구조)
  const toglDatatitle = 
      filterType === 'ALL'
        ? '전체보기'
        : filterType === 'IN_PROGRESS'
        ? '진행중'
        : filterType === 'UPCOMING'
        ? '시작예정'
        : '완료됨'
  ;

  //프로젝트 켈린더 클릭시 작동
  const handleEventClick = (clickedItem) => {
    console.log(clickedItem);
    selectProject(clickedItem.project_id);
  };

  return (
    <div className="border-container">
      <header className="dashboard-header">
        <span className="subtitle">프로젝트 관리</span>
        <ColorTeg title={toglDatatitle} count={filteredProjects.length}/>
        <div className="dashboard-top">
          <button
            className="register-btn"
            onClick={oppenModal}
          >
            + 프로젝트 등록
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '30px' }}>
        <div
          className='boder'
          style={{ 
            padding: '30px',
            paddingBottom: '100px',
            flex: '1', display: 'flex', flexFlow: 'column'
          }}>
          <div className="horizontal-box" style={{ fontSize: '13px', marginBottom:"30px"}}>
            <div><h2> 프로젝트 리스트 </h2></div>
            <select
              style={{ width: '150px', marginLeft:'scroll'}}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">전체보기 ({projectData.length})</option>
              <option value="IN_PROGRESS">진행중 (시작중)</option>
              <option value="UPCOMING">시작예정</option>
              <option value="COMPLETED">완료된 프로젝트</option>
            </select>
          </div>
          <div style={{ overflowY: 'scroll', maxHeight: '480px', display: 'flex', flexFlow: 'column', flex: '1', gap: '10px' }}>
            {filteredProjects.map((item) => {
              return (
                <ProjectListModule
                  key={item.project_id}
                  data={item}
                  buttonClick={selectProject}
                />
              );
            })}
          </div>
        </div>

        <div className="boder"
          style={{
            flex: '1',
            padding: '30px'
        }}>
          {/* 캘린더에도 필터링된 결과를 같이 보여주려면 filteredProjects, 전체를 유지하려면 projectData 전달 */}
          <BasicCalendar
            schedule={filteredProjects}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {isModal ? (
        <ModalBase
          onClose={clossModal}
          title={'프로젝트 등록'}
          layout={<SetNewProjectLayout setIsModal={clossModal} onClose={clossModal} />}
        />
      ) : null}

      {isProjectDetail ? (
        <ModalBase
          title={selectProjectTitle}
          onClose={clossProjectDetail}
          layout={
            <ProjectDetail
              project={selectData[0]}
              onClose={clossProjectDetail}
            />
          }
        />
      ) : null}
    </div>
  );
}