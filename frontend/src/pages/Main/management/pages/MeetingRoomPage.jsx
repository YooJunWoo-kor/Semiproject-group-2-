import React, { useEffect, useState } from "react";
import axios from "axios";
import ModalBase from "../../../../components/ModalBase";
import { API_BASE_URL, getTodayString } from "../../../../utils/authStorage";
import "./MeetingRoomPage.css";

const rooms = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    name: "회의실 " + (i + 1)
}));

const timeOptions = Array.from({ length: 48 }, (_, i) =>
    String(Math.floor(i / 2)).padStart(2, "0") + ":" + (i % 2 === 0 ? "00" : "30")
);

const emptyForm = { title: "", content: "", reserverName: "", phone: "", email: "" };

function MeetingRoomPage() {
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [reservationForm, setReservationForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    useEffect(() => {
        const loadReservations = async () => {
            if (!selectedDate) {
                setReservations([]);
                return;
            }

            try {
                const response = await axios.get(API_BASE_URL + "/meeting-rooms/reservations", {
                    params: { date: selectedDate }
                });
                setReservations(response.data);
            } catch (error) {
                console.error("예약 조회 오류:", error);
                setReservations([]);
            }
        };

        loadReservations();
    }, [selectedDate, refreshKey]);

    const handleRoomClick = (room) => {
        setStartTime("");
        setEndTime("");
        setSelectedRoom(room);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReservationForm(prev => ({ ...prev, [name]: value }));
    };

    const handleReservationSubmit = async (e) => {
        e.preventDefault();
    
        if (!selectedDate || !startTime || !endTime) {
            alert("예약 날짜와 시간을 선택해주세요.");
            return;
        }
    
        const isReserved = reservations.some(item =>
            Number(item.room_id) === selectedRoom.id &&
            item.start_time < endTime &&
            item.end_time > startTime
        );
    
        if (isReserved) {
            alert("이미 예약된 시간입니다.");
            return;
        }
    
        // 아래에 기존 axios.post() 예약 등록 코드 유지
    };

    return (
        <div className="border-container">
            <header className="dashboard-header">
                <span className="subtitle">회의실 예약</span>
            </header>

            <div className="meeting-room-filter form-inputs">
                <label>
                    예약 날짜
                    <input type="date" min={getTodayString()} value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)} />
                </label>

            </div>

            <div className="meeting-room-grid">
                {rooms.map(room => {

                    const roomReservations = reservations.filter(
                        item => Number(item.room_id) === room.id
                    );

                    return (
                        <div key={room.id} className="meeting-room-card">

                            <h3>{room.name}</h3>

                            <div className="meeting-room-slots">
                                {roomReservations.length === 0 ? (
                                    <p>예약 없음</p>
                                ) : (
                                    roomReservations.map(item => (
                                        <div key={item.reservation_id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedReservation(item)}
                                            >
                                                {item.title}
                                            </button>

                                            <span>
                                                {item.start_time} ~ {item.end_time}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRoomClick(room)}
                            >
                                예약하기
                            </button>

                        </div>
                    );
                })}
            </div>

            {selectedRoom && (
                <ModalBase title={selectedRoom.name + " 예약"} onClose={() => setSelectedRoom(null)}
                    layout={
                        <form className="draft-box meeting-room-form" onSubmit={handleReservationSubmit}>

                            <p>예약 날짜: {selectedDate}</p>

                            <div className="draft-row">
                                <label>
                                    시작 시간
                                    <select
                                        value={startTime}
                                        onChange={(e) => {
                                            setStartTime(e.target.value);
                                            setEndTime("");
                                        }}
                                        required
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
                                        required
                                    >
                                        <option value="">종료 시간 선택</option>
                                        {[...timeOptions, "24:00"].filter(time => time > startTime).map(time => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label>회의 제목
                                <input name="title" value={reservationForm.title}
                                    onChange={handleInputChange} required />
                            </label>
                            <label>회의 내용
                                <textarea name="content" value={reservationForm.content}
                                    onChange={handleInputChange} />
                            </label>
                            <div className="draft-row">
                                <label>예약자 이름
                                    <input name="reserverName" value={reservationForm.reserverName}
                                        onChange={handleInputChange} required />
                                </label>
                                <label>연락처
                                    <input type="tel" name="phone" value={reservationForm.phone}
                                        onChange={handleInputChange} />
                                </label>
                            </div>
                            <label>이메일
                                <input type="email" name="email" value={reservationForm.email}
                                    onChange={handleInputChange} />
                            </label>
                            <div className="draft-actions">
                                <button type="submit" className="erp-primary-button" disabled={isSaving}>
                                    {isSaving ? "예약 처리 중..." : "예약하기"}
                                </button>
                            </div>

                        </form>
                    }
                />
            )}
        </div>
    );
}

export default MeetingRoomPage;
