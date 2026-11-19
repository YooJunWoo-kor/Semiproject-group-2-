
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL, getLoginUser } from "./authStorage";

const toMinutes = (num, type) => {
    const n = Number(num);
    if (!Number.isFinite(n) || n <= 0) return 0;

    if (type === "m") return n;
    if (type === "h") return n * 60;
    if (type === "d") return n * 1440;
    return 0;
};

// DB의 날짜와 시간을 결합해 분 단위 시각으로 변환
const parseMinute = (date, time) => {
    const day = String(date ?? "").slice(0, 10);
    const clock = String(time ?? "").slice(0, 8);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(clock)) return null;

    const dateTime = new Date(
        `${day}T${clock.length === 5 ? clock + ":00" : clock}`
    );

    return Number.isNaN(dateTime.getTime())
        ? null
        : Math.floor(dateTime.getTime() / 60000);
};

const loadNotifications = (userID) => {
    if (!userID) return [];

    try {
        const saved = JSON.parse(
            localStorage.getItem(`schedule-notifications-${userID}`) || "[]"
        );
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

export function useScheduleAlarm() {
    const userID = getLoginUser()?.employeeKey;

    const [notifications, setNotifications] = useState(() =>
        loadNotifications(userID)
    );
    const [toast, setToast] = useState(null);

    // 이미 생성한 알림 ID를 기억해 중복 생성 방지
    const seenRef = useRef(
        new Set(notifications.map((item) => item.id))
    );

    // 새 알림과 읽음 상태를 브라우저에 저장
    useEffect(() => {
        if (!userID) return;

        localStorage.setItem(
            `schedule-notifications-${userID}`,
            JSON.stringify(notifications)
        );
    }, [userID, notifications]);

    useEffect(() => {
        if (!userID) return;

        let stopped = false;
        let checking = false;

        const checkScheduleAlarms = async () => {
            if (checking) return;
            checking = true;

            try {
                const response = await axios.post(
                    `${API_BASE_URL}/schedule/getMyAlarms`,
                    { userID }
                );

                if (stopped || !Array.isArray(response.data)) return;

                const nowMin = Math.floor(Date.now() / 60000);

                response.data.forEach((item) => {
                    const interval = toMinutes(item.timerNum, item.timerType);
                    if (!interval) return;

                    const endMin = parseMinute(item.end_date, item.end_time);
                    if (endMin === null) return;

                    let triggerMin = null;

                    if (item.timerTiming === "마감전") {
                        triggerMin = endMin - interval;
                    } else if (item.timerTiming === "반복") {
                        const startMin = parseMinute(
                            item.start_date,
                            item.start_time
                        );

                        if (startMin === null) return;
                        if (nowMin < startMin || nowMin > endMin) return;

                        const repeatCount = Math.floor(
                            (nowMin - startMin) / interval
                        );

                        if (repeatCount < 1) return;
                        triggerMin = startMin + repeatCount * interval;
                    }

                    // 예정 시각부터 1분 이내에만 알림 표시
                    if (
                        triggerMin === null ||
                        nowMin < triggerMin ||
                        nowMin - triggerMin > 1 ||
                        nowMin > endMin
                    ) {
                        return;
                    }

                    const id = `${userID}-${item.schedule_id}-${item.timerTiming}-${triggerMin}`;

                    if (seenRef.current.has(id)) return;
                    seenRef.current.add(id);

                    const unit = {
                        m: "분",
                        h: "시간",
                        d: "일"
                    }[item.timerType];

                    const message =
                        item.timerTiming === "마감전"
                            ? `마감 ${item.timerNum}${unit} 전입니다.`
                            : `${item.timerNum}${unit} 간격 반복 알림입니다.`;

                    const newNotification = {
                        id,
                        title: item.schedule_name,
                        message,
                        read: false,
                        createdAt: new Date().toISOString()
                    };

                    setNotifications((prev) =>
                        [newNotification, ...prev].slice(0, 100)
                    );

                    setToast(newNotification);
                });
            } catch (error) {
                if (!stopped) {
                    console.error("일정 알림 조회 실패:", error);
                }
            } finally {
                checking = false;
            }
        };

        checkScheduleAlarms();

        const timer = setInterval(checkScheduleAlarms, 15000);

        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [userID]);

    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, read: true } : item
            )
        );

        setToast((prev) => (prev?.id === id ? null : prev));
    };

    const dismissToast = () => setToast(null);

    return {
        notifications,
        markAsRead,
        toast,
        dismissToast
    };
}
