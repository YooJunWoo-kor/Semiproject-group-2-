import { useState } from "react";
import React from "react";
import ModalBase from "../../../../components/ModalBase";
import "./MeetingRoomPage.css"
import { getTodayString,API_BASE_URL } from "../../../../utils/authStorage";
import axios from "axios";
import React, { useEffect, useState } from "react";

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
    const [reservations, setReservations] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

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

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/meeting-rooms/reservations`,
                    {
                        params: { date: selectedDate }
                    }
                );
    
                setReservations(response.data);
    
            } catch (error) {
                console.error("예약 조회 오류:", error);
                setReservations([]);
            }
        };
    
        fetchReservations();
    
    }, [selectedDate, refreshKey]);

    const handleRoomClick = (room) => {
        if (!selectedDate || !startTime || !endTime) {
            alert("예약 날짜와 시간을 선택해주세요.");
            return;
        }
    
        const isReserved = reservations.some(reservation => // 조건을 만족하는 것 하나라도 있으면 예약된 것
            Number(reservation.room_id) === room.id &&
            reservation.start_time < endTime &&
            reservation.end_time > startTime
        );
    
        if (isReserved) {
            alert("이미 예약된 시간입니다.");
            return;
        }
    
        setSelectedRoom(room);
    };

    const [reservationForm, setReservationForm] = useState({
        title: "",
        content: "",
        reserverName: "",
        phone: "",
        email: ""
    });

    const [isSaving, setIsSaving] = useState(false);

const handleReservationSubmit = async (e) => {
    e.preventDefault();

    if (isSaving || !selectedRoom) return;

    try {
        setIsSaving(true);

        const response = await axios.post(
            `${API_BASE_URL}/meeting-rooms/reservations`,
            {
                roomId: selectedRoom.id,
                reservationDate: selectedDate,
                startTime,
                endTime,
                ...reservationForm
            }
        );

        alert(response.data.message);
        setSelectedRoom(null);

        setReservationForm({
            title: "",
            content: "",
            reserverName: "",
            phone: "",
            email: ""
        });

    } catch (error) {
        alert(
            error.response?.data?.message ||
            "예약에 실패했습니다."
        );
    } finally {
        setIsSaving(false);
    }
};

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
                            <form onSubmit={handleReservationSubmit}>
                    
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

                                <button type="submit" disabled={isSaving}>
                                    {isSaving ? "예약 처리 중..." : "예약하기"}
                                </button>
                    
                            </form>
                        </div>
                    }
                />
            )}
        </div>
    );
}


export default MeetingRoomPage;