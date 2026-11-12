import React, { useEffect, useState } from "react";
import axios from 'axios';
import { getLoginUser, getTodayString, API_BASE_URL, TOGLE_COLORS } from '../../../utils/authStorage'
import GetPopover from '../../../components/GetPopover';

import DepartmentList from "../../../components/DepartmentList";


function ScheduleModalPopup({onClose}){
    //오늘날짜 가져오기
    let today = getTodayString();
  
    const [title,setTitle] = useState('');
    const [startDay,setStartDay] = useState(today);
    const [endDay, setEndDay] = useState('');
    const [participant, setParticipant] = useState([]);
    const [scheduleType, setScheduleType] = useState(true);
    const [description, setDescription] = useState('');
    const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
    const [timerNum, setTimerNum] = useState(10);
    const [timerType, setTimerType] = useState('h');
    const [timerTiming, setTimerTiming] = useState('마감전')
    const [startTimeH, setStratTimeH] = useState('시');
    const [startTimeM, setStratTimeM] = useState('분');
    const [endTimeH, setEndTimeH] = useState('시');
    const [endTimeM, setEndTimeM] = useState('분');
    const [typeId, setTypeId] = useState(0);
  
    const hList = [];
    for(let i = 0; i < 24; i++){
      hList.push(String(i).padStart(2,0));
    }
  
    const mList = [];
    for(let i = 0; i <= 60; i+=5){
      mList.push(String(i).padStart(2,0));
    }
  
    //유저 리스트 추가
    const listset = function(value){
      setParticipant([...participant, value]);
    }
    //유저 리스트 삭제
    const editList = function(index){
      setParticipant(participant.filter((_,i)=> i != index))
    }
  
    const onSubmit = async function(e){
      e.preventDefault();
  
      let startTime = startTimeH + ':' + startTimeM + ':00'
      let endTime = endTimeH + ':' + endTimeM + ':00'
  
      const userID = getLoginUser().employeeKey;
      try {
        const response = await axios.post(
          API_BASE_URL + '/schedule/setSchedule',
          { title,        //제목
            scheduleType, //공개여부
            userID,       //작성자
            startDay,     //시작일시
            endDay,       //종료일시
            startTime,    //시작시간
            endTime,      //종료시간
            typeId,          //색상
            description,  //스케쥴상세내용
    
            participant,     //유저리스트
            isNotifyEnabled, //알람상태
            timerNum,        //타이머시간
            timerType,       //타이머타입 (일, 시, 분)
            timerTiming,     //타이머타이밍 (마감전, 반복)
          });
  
          if( response.data.status){
            alert( response.data.message );
            onClose();
          }
      } catch (error) {
        if(error.response?.status == '500'){
          alert(error.response.message);
        }
        else if(error.response?.status == '400'){
          alert(error.response.message);
        }
        else{
          alert('요청중 에러가 발생했습니다.')
        }
      }
    };
    
    return (
      <form onSubmit={onSubmit} style={{display:'flex',flexFlow:'column',gap:'20px'}}>
        {/* 제목 */}
        <div>
          <label>제목</label>
          <div style={{display:'flex',gap:'5px'}}>
            <input 
              className="form-input"
              placeholder="스케줄 제목을 입력하세요" 
              value = {title}
              onChange = {(e)=>{setTitle(e.target.value)}}
              required 
              style={{flex:'8'}}
            />
            <select
              style={{
                flex:'1',
                color: TOGLE_COLORS[typeId],
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
              value = {typeId}
              onChange={(e)=>{setTypeId(e.target.value)}}>
              {/* TOGLE_COLORS.map실행하기 */}
              {TOGLE_COLORS.map((item, index)=>(
                <option
                  key={index}
                  value={index}
                  style={{color: item}
                }>
                  ●
                </option>
              ))}
            </select>
          </div>
        </div>
  
        {/* 시작일 & 종료일 (2열 가로 정렬) */}
        <div style = {{display:'flex', gap: '10px'}}>
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
        <div style = {{display:'flex', gap: '10px'}}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>시작 시간</label>
            <div style={{display: 'flex', gap:'5px'}}>
              <select value={startTimeH} onChange={(e)=>{setStratTimeH(e.target.value)}}>
                <option>시</option>
                {hList.map((item)=>(
                  <option value={item}>{item}</option>
                ))}
              </select>
              <select value={startTimeM} onChange={(e)=>{setStratTimeM(e.target.value)}}>
                <option>분</option>
                {mList.map((item)=>(
                  <option value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>마감 시간</label>
            <div style={{display: 'flex', gap:'5px'}}>
              <select value={endTimeH} onChange={(e)=>{setEndTimeH(e.target.value)}}>
                <option >시</option>
                {hList.map((item)=>(
                  <option value={item}>{item}</option>
                ))}
              </select>
              <select value={endTimeM} onChange={(e)=>{setEndTimeM(e.target.value)}}>
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
                  {item.name}
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
              <input type="radio" name="schedule_type" value="PUBLIC" checked = {scheduleType} onChange = {()=>{setScheduleType(true)}}/>
              공개
            </label>
            <label className="radio-item">
              <input type="radio" name="schedule_type" value="PRIVATE" checked = {!scheduleType} onChange = {()=>{setScheduleType(false)}}/>
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
            value = {description}
            placeholder="스케줄 내용을 입력하세요" 
            onChange = {(e)=>{setDescription(e.target.value)}}
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
                    value="마감전"
                    checked = {timerTiming == '마감전'}
                    onChange = {()=>{setTimerTiming('마감전')}}
                  />
                  마감 전
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="notify_mode"
                    value="반복"
                    checked = {timerTiming == '반복'}
                    onChange = {()=>{setTimerTiming('반복')}}
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
  
  
  
  export default ScheduleModalPopup;