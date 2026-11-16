import axios from "axios";
import React, { useState } from "react";
import GetPopover from '../../../../components/GetPopover';
import DepartmentList from '../../../../components/DepartmentList';
import { TOGLE_COLORS, API_BASE_URL, getLoginUser } from '../../../../utils/authStorage';

function SetNewProjectLayout({setIsModal}) {
    const [projectName, setProjectName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [leader, setLeader] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [visible, setVisible] = useState('public');
    const [typeId, setTypeId] = useState(0);
  
    //내 아이디
    const getMyID = getLoginUser();
    
    // 에러 번호: 0(정상), 1(제목), 2(시작일), 3(마감일), 4(내용), 5(리더)
    const [errStep, setErrStep] = useState(0);
  
    // 리더 설정
    const leaderSet = (value) => {
      if (!value || !value.employee_id) return;
      setLeader(value);
      if (errStep === 5) setErrStep(0);
    };
  
    // 리더 삭제
    const removeLeader = () => setLeader(null);
  
    // 참석자 삭제
    const editList = (index) => {
      setProjectMembers(projectMembers.filter((_, filterIndex) => filterIndex !== index));
    };
  
    // 유저 리스트 추가
    const listset = (value) => {
      if (!value) return;
      if (projectMembers.some((member) => member.employee_id === value.employee_id)) return;
      setProjectMembers((prev) => [...prev, value]);
    };
  
    // db전송
    const setProject = async () => {
      //순차적 검증
      if (!projectName.trim()) return setErrStep(1);
      if (!startDate) return setErrStep(2);
      if (!endDate) return setErrStep(3);
      if (!description.trim()) return setErrStep(4);
      if (!leader || !leader.employee_id) return setErrStep(5);
  
      setErrStep(0); // 모든 검증 통과
  
      const data = {
        project_name: projectName,
        start_date: startDate,
        end_date: endDate,
        description: description,
        is_visible: visible === 'public',
        employee_id: leader.employee_id,
        members: projectMembers,
        typeId: typeId
      };
  
      try {
        const setData = await axios.post(API_BASE_URL + '/project/setProject', data);
        if(setData.data.status === 'succesed')
        {
          alert('"'+projectName+'"프로젝트 등록이 성공했습니다');
          setIsModal();
        }
        
      } catch (error) {
        
      }
    };
  
    return (
      <div>
        <form
          style={{ display: 'flex', flexFlow: 'column', gap: '10px' }}
          onSubmit={(e) => {
            e.preventDefault();
            setProject();
          }}
        >
          {/* 제목 */}
          <div className="form-group">
            <label>제목</label>
            <div style={{display:'flex', gap:'10px'}}>
              <input
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (errStep === 1) setErrStep(0);
                }}
                placeholder="제목입력"
              />
              <select
                style={{
                  width:'100px'
                  , color: TOGLE_COLORS[typeId]
                }}
                value={typeId}
                onChange={(e)=>{
                  console.log(e.target.value);
                  setTypeId(e.target.value);
                }}
              >
                {TOGLE_COLORS.map((item, index)=>{
                  return (
                    <option
                      key={index}
                      value={index}
                      style={{color:item}}
                    >
                      ●
                    </option>
                  )
                })}
              </select>
  
            </div>
            {errStep === 1 && (
              <div style={{ fontSize: '11px', color: 'red' }}>제목을 입력 하거라</div>
            )}
          </div>
  
          {/* 날짜 */}
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div>
              <label>시작날짜</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (errStep === 2) setErrStep(0);
                }}
              />
              {errStep === 2 && (
                <div style={{ fontSize: '11px', color: 'red' }}>시작날짜를 설정 하거라</div>
              )}
            </div>
            <div>
              <label>마감날짜</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (errStep === 3) setErrStep(0);
                }}
              />
              {errStep === 3 && (
                <div style={{ fontSize: '11px', color: 'red' }}>마감날짜를 설정 하거라</div>
              )}
            </div>
          </div>
  
          {/* 내용 */}
          <div className="form-group">
            <label>내용</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errStep === 4) setErrStep(0);
              }}
              placeholder="내용 입력"
            />
            {errStep === 4 && (
              <div style={{ fontSize: '11px', color: 'red' }}>내용을 입력 하거라</div>
            )}
          </div>
  
          {/* 프로젝트 리더 */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>프로젝트 리더</label>
              <GetPopover
                value={leader ? '변경' : '+ 리더'}
                layout={<DepartmentList listset={leaderSet} />}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {errStep === 5 && (
                <div style={{ fontSize: '11px', color: 'red' }}>리더를 설정 하거라</div>
              )}
              {leader && (
                <span className="attendee-tag">
                  {leader.name || leader}
                  <button
                    type="button"
                    className="tag-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLeader();
                    }}
                  >
                    &times;
                  </button>
                </span>
              )}
            </div>
          </div>
  
          {/* 참석자 영역 */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>참석자</label>
              <GetPopover
                value={'+추가'}
                layout={<DepartmentList listset={listset} />}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {projectMembers.map((item, index) => (
                <span key={item.employee_id || index} className="attendee-tag">
                  {item.name || item}
                  <button
                    type="button"
                    className="tag-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      editList(index);
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
  
          {/* 공개여부 */}
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <label>공개여부</label>
            <label>
              <input
                type="radio"
                name="visible"
                value="public"
                checked={visible === 'public'}
                onChange={(e) => setVisible(e.target.value)}
              />
              공개
            </label>
            <label>
              <input
                type="radio"
                name="visible"
                value="private"
                checked={visible === 'private'}
                onChange={(e) => setVisible(e.target.value)}
              />
              비공개
            </label>
          </div>
  
          {/* 버튼 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '100px' }}>
            <button type="submit" style={{ marginLeft: 'auto' }}>
              완료
            </button>
            <button type="button">
              취소
            </button>
          </div>
        </form>
      </div>
    );
  }

  export default SetNewProjectLayout;