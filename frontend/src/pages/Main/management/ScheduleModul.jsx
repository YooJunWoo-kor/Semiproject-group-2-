
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import StatisticsCard from '../../../components/StatisticsCard';
import ModalBase from '../../../components/ModalBase'
import axios from 'axios';
import { getLoginUser, getTodayString, API_BASE_URL } from '../../../utils/authStorage'
import GetPopover from '../../../components/GetPopover';

function ScheduleModul() {
    //모달팝업용
    const [isModal, setisModal] = useState(false);
    const openModal = ()=> setisModal(true);
    const closeModal = ()=> setisModal(false);

    return (
        <div className="sub-container">
            <header className="dashboard-header">
                <span className="subtitle">일정관리</span>
                <div className="dashboard-top">
                    <button
                        type="button"
                        className="register-btn"
                        onClick={() =>{openModal()}}
                    >
                        + 일정 등록
                    </button>
                </div>
            </header>

            <section className="stats-section">
                <StatisticsCard title={"마감임박"} count={"5"} stiyle={0}/>
                <StatisticsCard title={"주요일정"} count={"5"} stiyle={0}/>
            </section>
            <div style={{
                display: "flex",
                gap: '30px'
                }}>
                <div style={{ flex: '0.5' }}>
                    <BasicCalendar />
                </div>
                <div style={{ flex: '0.5' }} >
                    <WeeklyCalendar />
                </div>
            </div>
            
            {/* onClose, title, layout */}
            {isModal ? <ModalBase onClose={closeModal} title={"일정 등록"} layout={<ScheduleModalPopup/>}/>: <div></div>}
        </div>
    );
}

function ScheduleModalPopup(){
  //오늘날짜 가져오기
  let today = getTodayString();

  const [title,setTitle] = useState('');
  const [startDay,setStartDay] = useState(today);
  const [endDay, setEndDay] = useState('');
  const [participant, setParticipant] = useState([]);
  const [visible, setVisible] = useState(true);
  const [velues, setValues] = useState('');
  const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
  const [timerNum, setTimerNum] = useState(10);
  const [timerType, setTimerType] = useState('h');
  const [timerTiming, setTimerTiming] = useState('REPEAT')
  const [startTimeH, setStratTimeH] = useState('00');
  const [startTimeM, setStratTimeM] = useState('00');
  const [endTimeH, setEndTimeH] = useState('00');
  const [endTimeM, setEndTimeM] = useState('00');

  const hList = [];
  for(let i = 0; i < 24; i++){
    hList.push(String(i).padStart(2,0));
  }

  const mList = [];
  for(let i = 0; i <= 60; i+=5){
    mList.push(String(i).padStart(2,0));
  }

  console.log(mList)

  //유저 리스트 추가
  const listset = function(value){
    setParticipant([...participant, value]);
  }
  //유저 리스트 삭제
  const editList = function(index){
    setParticipant(participant.filter((_,i)=> i != index))
  }

  const onSubmit = function(e){
    e.preventDefault();
    const userID = getLoginUser().employeeKey;
    const response = axios.post(
      API_BASE_URL + '/schedule/setSchedule',
      {userID, title, startDay, endDay, participant, visible, velues, isNotifyEnabled, timerNum, timerType, timerTiming}
    );
  };
  
  return (
    <form onSubmit={onSubmit}>
      {/* 제목 */}
      <div className="form-group">
        <label>제목</label>
        <input 
          type="text" 
          className="form-input"
          placeholder="스케줄 제목을 입력하세요" 
          value = {title}
          onChange = {(e)=>{setTitle(e.target.value)}}
          required 
        />
      </div>

      {/* 시작일 & 종료일 (2열 가로 정렬) */}
      <div style = {{display:'flex'}}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>시작일</label>
          <input
            type="date"
            className="form-input"
            value ={startDay}
            onChange={(e)=>{setStartDay(e.target.value)}}
            required
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>종료일</label>
          <input
            type="date"
            className="form-input"
            value = {endDay}
            onChange={(e)=>{setEndDay(e.target.value)}}
            required
          />
        </div>
      </div>
      {/* 시작일 & 종료일 (2열 가로 정렬) */}
      <div style = {{display:'flex'}}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>시작 시간</label>
          <div style={{display: 'flex'}}>
            <select >
              <option>시</option>
              {hList.map((item)=>(
                <option value={item}>{item}</option>
              ))}
            </select>
            <select>
              <option>분</option>
              {mList.map((item)=>(
                <option value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>마감 시간</label>
          <div style={{display: 'flex'}}>
            <select>
              <option value={item}>시</option>
              {hList.map((item)=>(
                <option value={item}>{item}</option>
              ))}
            </select>
            <select>
              <option>분</option>
              {mList.map((item)=>(
                <option>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 참석자 영역 */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>참석자</label>
          <GetPopover
            value={'+추가'}
            layout={<DepartmentList listset = {listset}/>}/>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {participant.map((item, index)=>(
            <span className="attendee-tag">
                {item}
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

      {/* 공개 / 비공개 (Form.css의 라디오 클래스 사용) */}
      <div className="form-group">
        <label>공개 설정</label>
        <div className="radio-group">
          <label className="radio-item">
            <input type="radio" name="schedule_type" value="PUBLIC" checked = {visible} onChange = {()=>{setVisible(true)}}/>
            공개
          </label>
          <label className="radio-item">
            <input type="radio" name="schedule_type" value="PRIVATE" checked = {!visible} onChange = {()=>{setVisible(false)}}/>
            비공개
          </label>
        </div>
      </div>

      {/* 설명 */}
      <div className="form-group">
        <label>설명</label>
        <textarea 
          className="form-input form-textarea" 
          rows="3" 
          value = {velues}
          placeholder="스케줄 내용을 입력하세요" 
          onChange = {(e)=>{setValues(e.target.value)}}
        />
      </div>

    {/* 알림 설정 */}
    <div className="form-group">
    <label>알림 설정</label>

    {/* 1. 알림 켜기 / 끄기 라디오 버튼 */}
    <div className="radio-group">
      <label className="radio-item">
        <input
          type="radio"
          name="notify_enable"
          value="true"
          checked={isNotifyEnabled === true}
          onChange={() => setIsNotifyEnabled(true)}
        />
        알림 켜기
      </label>
      <label className="radio-item">
        <input
          type="radio"
          name="notify_enable"
          value="false"
          checked={isNotifyEnabled === false}
          onChange={() => setIsNotifyEnabled(false)}
        />
        알림 끄기
      </label>
    </div>

    {/* 2. 알림 켜짐 상태일 때 표시되는 세부 옵션 */}
    {isNotifyEnabled && (
      <div className="notification-options">
        <div className="notification-input-group">
          <input
            type="number"
            min="1"
            className="form-input notify-time-input"
            placeholder="숫자 입력"
            value = {timerNum}
            onChange = {(e)=>{setTimerNum(timerNum)}}
          />
          <select className="form-input notify-unit-select"
            value = {timerType}
            onChange = {(e)=>{setTimerType(e.target.value)}}
            >
            <option value="m">분</option>
            <option value="h">시간</option>
            <option value="d">일</option>
          </select>
        </div>

        {/* 마감 전 / 반복 설정 라디오 버튼 */}
        <div className="radio-group">
              <label className="radio-item">
                <input
                  type="radio"
                  name="notify_mode"
                  value="DEADLINE"
                  checked = {timerTiming == 'DEDLINE'}
                  onChange = {()=>{setTimerTiming('DEDLINE')}}
                />
                마감 전
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="notify_mode"
                  value="REPEAT"
                  checked = {timerTiming == 'REPEAT'}
                  onChange = {()=>{setTimerTiming('REPEAT')}}
                />
                반복
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 액션 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button type="submit" className="btn-submit">
          등록
        </button>
      </div>
    </form>
  );
}

function DepartmentList({listset}){
  return(
    <div style={{display:"flex", padding: "0 20px", paddingBottom: "50px", fontSize: "13px", gap: "5px"}}>
      <div style={{display: 'flex', flexFlow: 'column'}}>
        <p>부서</p>
        <button>부서명</button>
        <button>부서명</button>
        <button>부서명</button>
      </div>
      <span style={{width: '1px', backgroundColor: '#ddd', margin:'0px 10px'}}/>
      <div style={{display: 'flex', flexFlow: 'column'}}>
        <p>부서인원</p>
        <button
          value = '리스트1'
          onClick = {(e)=>{listset(e.target.value)}}>리스트 1</button>
        <button>리스트 1</button>
        <button>리스트 1</button>
        <button>리스트 1</button>
      </div>
    </div>
  )
}

export default ScheduleModul;
