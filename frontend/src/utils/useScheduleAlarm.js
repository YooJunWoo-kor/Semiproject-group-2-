import { useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL, getLoginUser } from './authStorage';

// 단위(m, h, d)를 '분(minute)' 단위로 변환
const convertToMinutes = (num, type) => {
    const n = Number(num) || 0;
    if (type === 'm') return n;
    if (type === 'h') return n * 60;
    if (type === 'd') return n * 60 * 24;
    return 0;
};

// 초(second) 단위를 제외한 '분(minute)' 기준 타임스탬프 반환
const getMinuteTimestamp = (dateObj) => {
    return Math.floor(dateObj.getTime() / (1000 * 60));
};

export function useScheduleAlarm() {
    // 같은 분(minute)에 동일한 알람이 중복 실행되는 것 방지
    const notifiedRef = useRef(new Set());

    useEffect(() => {
        const checkScheduleAlarms = async () => {
            const user = getLoginUser();
            const userID = user?.employeeKey;
            if (!userID) return;

            try {
                // 백엔드에서 이미 isNotifyEnabled = '1' 인 일정만 조회함
                const res = await axios.post(`${API_BASE_URL}/schedule/getMyAlarms`, { userID });
                const alarms = res.data;

                const now = new Date();
                const nowMin = getMinuteTimestamp(now);

                alarms.forEach((item) => {
                    const intervalMin = convertToMinutes(item.timerNum, item.timerType);
                    if (intervalMin <= 0) return;

                    let shouldNotify = false;
                    let alarmLabel = '';

                    // 1. '마감전' 알람 체크: (마감일시 - 설정 시간) === 현재 시각
                    if (item.timerTiming === '마감전') {
                        const endDate = new Date(item.end_date);
                        const targetMin = getMinuteTimestamp(endDate) - intervalMin;

                        if (nowMin === targetMin) {
                            shouldNotify = true;
                            alarmLabel = `마감 ${item.timerNum}${item.timerType} 전`;
                        }
                    }
                    // 2. '반복' 알람 체크: 시작일시 이후 경과 시간이 설정 주기의 배수일 때
                    else if (item.timerTiming === '반복') {
                        const startDate = new Date(item.start_date);
                        const startMin = getMinuteTimestamp(startDate);
                        const elapsedMin = nowMin - startMin;

                        if (elapsedMin >= 0 && elapsedMin % intervalMin === 0) {
                            shouldNotify = true;
                            alarmLabel = `${item.timerNum}${item.timerType} 주기 반복 알림`;
                        }
                    }

                    // 3. 조건 충족 시 중복 확인 후 알람 실행
                    const uniqueKey = `${item.schedule_id}_${nowMin}`;
                    if (shouldNotify && !notifiedRef.current.has(uniqueKey)) {
                        notifiedRef.current.add(uniqueKey);
                        alert(`⏰ [${alarmLabel}]\n일정: ${item.schedule_name}`);
                    }
                });
            } catch (error) {
                console.error('스케줄 알람 체크 오류:', error);
            }
        };

        checkScheduleAlarms();
        const timer = setInterval(checkScheduleAlarms, 60 * 1000);
        return () => clearInterval(timer);
    }, []);
}