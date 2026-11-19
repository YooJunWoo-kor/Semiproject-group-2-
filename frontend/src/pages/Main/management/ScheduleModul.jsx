import React, { useEffect, useState } from 'react';
import BasicCalendar from '../../../components/calendar/BasicCalendar';
import WeeklyCalendar from '../../../components/weeklycalendar/WeeklyCalendar';
import ModalBase from '../../../components/ModalBase';
import ScheduleModalPopup from './ScheduleModalPopup';
import axios from 'axios';
import { formatDateToYYYYMMDD, API_BASE_URL, getLoginUser, getTodayString } from '../../../utils/authStorage';
import ColorTeg from '../../../components/ColorTeg';
import EmployeeTag from '../../../components/EmployeeTag';
import ProjectProgress from '../../../components/ProjectProgress';

function ScheduleModul({ dataType = 1, isMain = false }) {
    // 로그인 유저 정보 get
    const user = getLoginUser();

    // 메인 대시보드용 라디오 필터 상태 (isMain일 때 사용, 아닐 때는 부모 props dataType 사용)
    const [mainDataType, setMainDataType] = useState(Number(dataType));
    const activeDataType = isMain ? mainDataType : Number(dataType);

    // 모달팝업용
    const [isModal, setisModal] = useState(false);
    const openModal = () => setisModal(true);
    const closeModal = () => setisModal(false);

    // 스케줄 데이터 get
    const [allScheduleData, setAllScheduleData] = useState([]);

    // 전체공개 스케줄 데이터
    const getSchduleData = async function () {
        try {
            const getData = await axios.get(API_BASE_URL + '/schedule/getSchedulData');
            const scheduleData = getData.data;

            const dataSet = scheduleData.map((item) => {
                const start = formatDateToYYYYMMDD(item.start_date);
                const end = formatDateToYYYYMMDD(item.end_date);

                return {
                    scheduleID: item.schedule_id,
                    title: item.schedule_name || item.title || item.description,
                    description: item.description || item.content || "",
                    start: start,
                    end: end,
                    typeId: item.type_id,
                    employee_id: item.employee_id
                };
            });

            setAllScheduleData(dataSet);
        } catch (error) {
            alert('스케쥴 데이터에러', error);
        }
    };

    // 내가 포함된 스케줄 데이터
    const [mySchduleData, setMySchduleData] = useState([]);
    const getMySchduleData = async function () {
        try {
            const userID = user.employeeKey;
            const getData = await axios.post(API_BASE_URL + '/schedule/getMySchedule', { userID });

            const dataSet = getData.data.map((item) => {
                const start = formatDateToYYYYMMDD(item.start_date);
                const end = formatDateToYYYYMMDD(item.end_date);

                return {
                    scheduleID: item.schedule_id,
                    title: item.schedule_name || item.title || item.description,
                    description: item.description || item.content || "",
                    start: start,
                    end: end,
                    typeId: item.type_id,
                    employee_id: item.employee_id
                };
            });
            setMySchduleData(dataSet);
        } catch (error) {
            console.error(error.response?.data);
        }
    };

    // 프로젝트에서 등록한 할일 리스트
    const [myWorklistData, setMyWorklistData] = useState([]);
    const getMyWorklistData = async function () {
        try {
            const userID = user.employeeKey;
            const res = await axios.post(API_BASE_URL + '/schedule/getMyWorklist', { userID });
            const dataSet = res.data.map((item) => {
                const start = formatDateToYYYYMMDD(item.start);
                const end = formatDateToYYYYMMDD(item.end);

                return {
                    scheduleID: `work_${item.worklist_id}`, // 일반 schedule_id와 충돌 방지
                    title: `[할일] ${item.title}`,
                    description: item.content,
                    start: start,
                    end: end,
                    typeId: item.type_id,
                    employee_id: item.employee_id
                };
            });

            setMyWorklistData(dataSet);
        } catch (error) {
            console.error('프로젝트 할 일 스케줄 조회 에러:', error);
        }
    };

    // 전체 스케줄 목록 새로고침
    const refreshSchedules = () => {
        getSchduleData();
        getMySchduleData();
        getMyWorklistData();
    };

    useEffect(() => {
        refreshSchedules();
    }, []);

    let finalSchadulData = [];

    // 전체보기 선택 시
    if (activeDataType === 1) {
        let filterMySchaduleData = mySchduleData.filter((item) => {
            const isFind = allScheduleData.find((allItem) => {
                return allItem.scheduleID === item.scheduleID;
            });
            return !isFind;
        });
        finalSchadulData = [...myWorklistData, ...allScheduleData, ...filterMySchaduleData];
    }
    // 내 일정 선택 시
    else if (activeDataType === 2) {
        finalSchadulData = [...mySchduleData];
    }
    // 마감 임박 선택 시
    else if (activeDataType === 3) {
        let filterMySchaduleData = mySchduleData.filter((item) => {
            const isFind = allScheduleData.find((allItem) => {
                return allItem.scheduleID === item.scheduleID;
            });
            return !isFind;
        });
        const sumData = [...allScheduleData, ...filterMySchaduleData];
        const today = new Date(getTodayString());
        finalSchadulData = sumData.filter((item) => {
            const endDay = new Date(item.end);
            return ((endDay - today) / (1000 * 60 * 60 * 24)) < 2;
        });
    }
    // 프로젝트 할일 리스트 보기
    else if (activeDataType === 4) {
        finalSchadulData = [...myWorklistData];
    }

    // 토글에 전달할 데이터
    const toglData = {
        title: activeDataType === 1 ? "전체보기" : activeDataType === 2 ? "내 일정" : activeDataType === 3 ? "마감임박" : "주요일정",
        count: finalSchadulData.length
    };

    // 스케줄 상세 데이터 보기
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    const handleEventClick = (item) => {
        setSelectedSchedule(item);
    };

    const closeScheduleDetail = () => {
        setSelectedSchedule(null);
    };

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">일정관리</span>
                <ColorTeg title={toglData.title} count={toglData.count} type={'개'} />
                {!isMain ? (
                    <div className="dashboard-top">
                        <button
                            type="button"
                            className="register-btn"
                            onClick={() => openModal()}
                        >
                            + 일정 등록
                        </button>
                    </div>
                ) : (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="scheduleType"
                                value={1}
                                checked={activeDataType === 1}
                                onChange={(e) => setMainDataType(Number(e.target.value))}
                            />
                            전체보기
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="scheduleType"
                                value={2}
                                checked={activeDataType === 2}
                                onChange={(e) => setMainDataType(Number(e.target.value))}
                            />
                            내 일정
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="scheduleType"
                                value={3}
                                checked={activeDataType === 3}
                                onChange={(e) => setMainDataType(Number(e.target.value))}
                            />
                            마감임박
                        </label>
                    </div>
                )}
            </header>

            {/* 캘린더 영역 */}
            <div style={{ display: "flex", gap: '30px' }}>
                <div style={{ flex: '1' }}>
                    <BasicCalendar
                        schedule={finalSchadulData}
                        onEventClick={handleEventClick}
                    />
                </div>
                {!isMain ? (
                    <div style={{ flex: '1' }}>
                        <WeeklyCalendar schedule={finalSchadulData} />
                    </div>
                ) : null}
            </div>

            {/* 일정 등록 모달 */}
            {isModal ? (
                <ModalBase
                    onClose={closeModal}
                    title={"일정 등록"}
                    layout={
                        <ScheduleModalPopup
                            onClose={closeModal}
                            setSubmit={refreshSchedules}
                        />
                    }
                />
            ) : (
                <div></div>
            )}

            {/* 일정 상세 모달 */}
            {selectedSchedule && (
                <ModalBase
                    onClose={closeScheduleDetail}
                    title={selectedSchedule.title || "일정 상세"}
                    layout={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px', marginBottom: '50px' }}>
                            <div>
                                <EmployeeTag id={selectedSchedule.employee_id} />
                                <ProjectProgress start={selectedSchedule.start} end={selectedSchedule.end} />
                            </div>
                            <div
                                style={{
                                    backgroundColor: '#efefef',
                                    padding: '30px',
                                    minWidth: '450px',
                                    height: '500px',
                                    borderRadius: '10px',
                                    overflowY: 'auto'
                                }}
                            >
                                {selectedSchedule.description || "등록된 상세 내용이 없습니다."}
                            </div>
                            <button
                                style={{ fontSize: "13px", width: '100px', marginLeft: 'auto' }}
                                onClick={closeScheduleDetail}
                            >
                                닫기
                            </button>
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default ScheduleModul;