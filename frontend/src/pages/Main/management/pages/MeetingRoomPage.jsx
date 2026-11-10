import { useState } from "react";
import React from "react";
import ModalBase from "../../../../components/ModalBase";
import "./MeetingRoomPage.css"
import { getTodayString } from "../../../../utils/authStorage";

const rooms = Array.from({length: 9}, (_, index) => ({
    id : index + 1,
    name : `회의실 ${index + 1}`
}))

const timeOptions = Array.from({length : 48}, (_, index) => {  // 30분으로 나누면 24시간이 48개
    const hour = String(Math.floor(index/2)).padStart(2, "0"); // 인덱스가 2번 증가할때마다 hour가 1씩 증가하는 구조
    const minute = index % 2 == 0 ? "00" : "30"; // 00과 30 반복

    return `${hour}:${minute}`;
})


function MeetingRoomPage() {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [endTime, setEndTime] = useState("");
    const [startTime, setStartTime] = useState("");
    const [selectedDate, setselectedDate] = useState(getTodayString());

    // 시작 시간보다 늦은 종료 시간만 표시
    const endTimeOptions = [...timeOptions, "24:00"].filter(
        time => time > startTime
    )

    const handleStartTimeChange = (value) => {
        setStartTime(value);

        // 시작 시간을 변경하여 종료시간이 유효하지 않으면 (시작시간보다 안 늦으면 초기화)
        if(endTime && endTime <= value){
            setEndTime("")
        } 
    };

    const handleRoomClick = (room) => {
        if(!selectedDate || !startTime || !endTime){
            alert("예약 날짜와 시작/종료 시간을 선택해주세요");
            return;
        }
        setSelectedRoom(room);
    }

    const [reservationForm, setReservationForm] = useState({
        title: "",
        content: "",
        reserverName: "",
        phone: "",
        email: ""
    });

    const handleReservationChange = (e) => {
        const {name, value} = e.target;

        setReservationForm(prev => ({
            ...prev,
            [name]: value
        }))
    }

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">회의실 예약</span>
            </header>

            <div className="meeting-room-filter">

                <label>
                    예약 날짜
                    <input
                        type="date"
                        min={getTodayString()}
                        value={selectedDate}
                        onChange={(e) => setselectedDate(e.target.value)}
                    />
                </label>

                <label>
                    시작 시간
                    <select
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                    >
                        <option value="">시작 시간 선택</option>

                        {timeOptions.map(time => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    종료 시간
                    <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={!startTime}
                    >
                        <option value="">종료 시간 선택</option>

                        {endTimeOptions.map(time => (
                            <option key={time} value={time}>
                                {time}
                            </option>
                        ))}
                    </select>
                </label>

            </div>

            <div className="meeting-room-grid">
                {rooms.map(room => (
                    <button
                        key={room.id}
                        type="button"
                        className="meeting-room-card"
                        onClick={() => handleRoomClick(room)}
                    >
                        <h3>{room.name}</h3>
                        <p>예약 정보 조회 준비 중</p>
                    </button>
                ))}
            </div>

            {selectedRoom && (
                <ModalBase
                    title={`${selectedRoom.name} 예약`}
                    onClose={() => setSelectedRoom(null)}
                    layout={
                        <div className="draft-box">
                            <form onSubmit={(e) => e.preventDefault()}>
                    
                                <h3>{selectedRoom.name}</h3>
                    
                                <p>예약 날짜: {selectedDate}</p>
                                <p>예약 시간: {startTime} ~ {endTime}</p>
                    
                                <div>
                                    <label>회의 제목</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={reservationForm.title}
                                        onChange={handleReservationChange}
                                        required
                                    />
                                </div>
                    
                                <div>
                                    <label>회의 내용</label>
                                    <textarea
                                        name="content"
                                        value={reservationForm.content}
                                        onChange={handleReservationChange}
                                    />
                                </div>
                    
                                <div>
                                    <label>예약자 이름</label>
                                    <input
                                        type="text"
                                        name="reserverName"
                                        value={reservationForm.reserverName}
                                        onChange={handleReservationChange}
                                        required
                                    />
                                </div>
                    
                                <div>
                                    <label>연락처</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={reservationForm.phone}
                                        onChange={handleReservationChange}
                                    />
                                </div>
                    
                                <div>
                                    <label>이메일</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={reservationForm.email}
                                        onChange={handleReservationChange}
                                    />
                                </div>
                    
                            </form>
                        </div>
                    }
                />
            )}
        </div>
    );
}


export default MeetingRoomPage;