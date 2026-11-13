import React, { useEffect, useState } from 'react';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import ModalBase from '../../../components/ModalBase'
import ScheduleModalPopup from './ScheduleModalPopup';
import axios from 'axios';
import { formatDateToYYYYMMDD, API_BASE_URL, getLoginUser, getTodayString } from '../../../utils/authStorage';
import ColorTeg from '../../../components/ColorTeg';

function ScheduleModul({dataType = 1}) {
    //로그인 유저 정보 get
    const user = getLoginUser();
    //모달팝업용
    const [isModal, setisModal] = useState(false);
    const openModal = ()=> setisModal(true);
    const closeModal = ()=> setisModal(false);

    //스케쥴 데이터 get
    const [allScheduleData, setAllScheduleData] = useState([]);

    //전체공개 스케쥴 데이터
    const getSchduleData = async function (){
        try {
            const getData = await axios.get(API_BASE_URL+'/schedule/getSchedulData');
            const scheduleData = getData.data;

            const dataSet = scheduleData.map((item)=>{
                const start = formatDateToYYYYMMDD(item.start_date);
                const end = formatDateToYYYYMMDD(item.end_date);

                return {
                    scheduleID: item.schedule_id
                    ,title: item.description
                    ,start: start
                    ,end: end
                    ,typeId: item.type_id
                }
            });

            setAllScheduleData(dataSet);
        } catch (error) {
            alert('스케쥴 데이터에러',error);
        }
    };

    //내가 포함된 스케쥴 데이터
    const [mySchduleData, setMySchduleData] = useState([]);
    const getMySchduleData = async function(){
        try {
            //유저ID
            const userID = user.employeeKey;
            const getData = await axios.post(API_BASE_URL + '/schedule/getMySchedule', {userID})

            const dataSet = getData.data.map((item)=>{
                const start = formatDateToYYYYMMDD(item.start_date);
                const end = formatDateToYYYYMMDD(item.end_date);

                return {
                    scheduleID: item.schedule_id
                    ,title: item.schedule_name
                    ,start: start
                    ,end: end
                    ,typeId: item.type_id
                }
            });
            setMySchduleData(dataSet);
        } catch (error) {
            console.error(error.response?.data);
        }
    };

    useEffect(()=>{
        getSchduleData();
        getMySchduleData();
    },[])

    let finalSchadulData = [];

    //전체보기 선택시
    if(dataType == 1){
        let filterMySchaduleData = mySchduleData.filter(
            (item)=>{
                const isFind = allScheduleData.find((allItem)=>{
                    return allItem.scheduleID === item.scheduleID;
                })
                return !isFind;
            }
        );
        finalSchadulData = [...allScheduleData, ...filterMySchaduleData];
    }
    //내 일정 선택 시
    else if(dataType == 2){
        finalSchadulData = [...mySchduleData];
    }
    //마감 임박 선택 시
    else if(dataType == 3){
        let filterMySchaduleData = mySchduleData.filter(
            (item)=>{
                const isFind = allScheduleData.find((allItem)=>{
                    return allItem.scheduleID === item.scheduleID;
                })
                return !isFind;
            }
        );
        const sumData = [...allScheduleData, ...filterMySchaduleData];
        const today = new Date(getTodayString());
        finalSchadulData = sumData.filter((item)=>{
            const endDay = new Date(item.end);
            return ((endDay - today)/(1000* 60 * 60 * 34)) < 2;
        });
    }

    //토글에전달할 데이터
    const toglData = {
        title: dataType == 1 ? "전체보기" : dataType == 2 ? "내일정" : "마감인박"
        , count: finalSchadulData.length
    };

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">일정관리</span>
                <ColorTeg title={toglData.title} count={toglData.count} type={'개'}/>
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

            {/* 켈린더에 스케쥴을 보내야 함 */}
            <div style={{
                display: "flex",
                gap: '30px'
                }}>
                <div style={{ flex: '0.5' }}>
                    <BasicCalendar schedule={finalSchadulData}/>
                </div>
                <div style={{ flex: '0.5' }} >
                    <WeeklyCalendar schedule={finalSchadulData}/>
                </div>
            </div>
            
            {/* onClose, title, layout */}
            {isModal ? <ModalBase onClose={closeModal} title={"일정 등록"}
              layout={<ScheduleModalPopup
                onClose={closeModal}
              />}/>: <div></div>}
        </div>
    );
}

export default ScheduleModul;