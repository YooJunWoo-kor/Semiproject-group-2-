import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import ProjectProgress from '../../../../components/ProjectProgress';
import ProjectWorkDetail from './ProjectWorkDetail';
import ProjectDetailWorkList from './ProjectDetailWorkList';
import ProjectStatusTage from "../../../../components/ProjectStatusTage";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";
import NewWorkList from "./NewWorkList";
import EmployeeTage from "../../../../components/EmployeeTag";


// 프로젝트 세부
function ProjectDetail({ project, onClose }) {
    const [bodyStyle, setBodyStyle] = useState(0);
    const [selectTask, setSelectTask] = useState(0);

    // 참여자 목록 및 버튼 옆 전체 리스트 팝오버 상태
    const [member, setMember] = useState([]);
    const [isMemberPopoverOpen, setIsMemberPopoverOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const moreBtnRef = useRef(null);
    const popoverRef = useRef(null);
    const closeTimerRef = useRef(null);

    const getLeader = async () => {
        try {
            let getProjectMember = await axios.post(
                API_BASE_URL + '/project/get_project_member',
                { projectID: project.project_id }
            );
            setMember(getProjectMember.data?.data || []);
        } catch (error) {
            console.error("프로젝트 멤버 조회 실패:", error);
        }
    };

    useEffect(() => {
        setIsMemberPopoverOpen(false);
        getLeader();
    }, [project.project_id]);

    // 타이머 정리
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    // 마우스가 버튼이나 팝오버 안으로 들어오면 닫힘 예약 취소
    const cancelClosePopover = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    // 마우스가 버튼과 팝오버 밖으로 나가면 180ms 뒤 자동 닫힘
    const scheduleClosePopover = () => {
        cancelClosePopover();
        closeTimerRef.current = setTimeout(() => {
            setIsMemberPopoverOpen(false);
        }, 180);
    };

    // 화면 밖 이탈 시 자동 닫힘 (스크롤 / 리사이즈)
    useEffect(() => {
        if (!isMemberPopoverOpen) return;

        const closeIfOutOfViewport = () => {
            if (!moreBtnRef.current) {
                setIsMemberPopoverOpen(false);
                return;
            }
            const btnRect = moreBtnRef.current.getBoundingClientRect();
            const isBtnOut =
                btnRect.bottom < 0 ||
                btnRect.top > window.innerHeight ||
                btnRect.right < 0 ||
                btnRect.left > window.innerWidth;

            if (isBtnOut) {
                setIsMemberPopoverOpen(false);
                return;
            }

            if (popoverRef.current) {
                const popRect = popoverRef.current.getBoundingClientRect();
                const isPopOut =
                    popRect.right > window.innerWidth ||
                    popRect.left < 0 ||
                    popRect.bottom > window.innerHeight ||
                    popRect.top < 0;

                if (isPopOut) {
                    setIsMemberPopoverOpen(false);
                }
            }
        };

        const rafId = requestAnimationFrame(closeIfOutOfViewport);

        window.addEventListener("scroll", closeIfOutOfViewport, true);
        window.addEventListener("resize", closeIfOutOfViewport);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", closeIfOutOfViewport, true);
            window.removeEventListener("resize", closeIfOutOfViewport);
        };
    }, [isMemberPopoverOpen]);

    const handleTogglePopover = () => {
        cancelClosePopover();
        if (!isMemberPopoverOpen && moreBtnRef.current) {
            const rect = moreBtnRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 10
            });
        }
        setIsMemberPopoverOpen((prev) => !prev);
    };

    return (
        <div style={{ width: '400px' }}>
            <style>{`
                .member-popover-portal button,
                .member-popover-portal button span,
                .member-popover-portal .attendee-tag,
                .member-popover-portal .attendee-tag span {
                    color: #ffffff !important;
                }
            `}</style>

            <header className="horizontal-box" style={{ marginBottom: '20px', marginTop: '10px' }}>
                <div>
                    <ProjectStatusTage start={project.start} end={project.end} />
                </div>
                <div style={{ display: 'flex', flex: '1' }}>
                    <ProjectProgress start={project.start} end={project.end} />
                </div>
            </header>

            <div style={{ display: "flex", flexFlow: 'column', gap: "20px" }}>

                {/* 참여인원 */}
                <section className="vertical-box boder" style={{ padding: "20px" }}>
                    <div className="horizontal-box">
                        <EmployeeTage id={project.employee_id} />
                    </div>
                    <div className="horizontal-box">
                        <strong style={{ width: '70px', flexShrink: 0 }}>
                            참여자 ({member?.length || 0})
                        </strong>

                        {member.length <= 3 ? (
                            <div style={{ display: "flex", gap: "5px" }}>
                                {member.map((item) => (
                                    <EmployeeTage key={item.employee_id} id={item.employee_id} />
                                ))}
                            </div>
                        ) : (
                            <div className="horizontal-box" style={{ gap: '5px' }}>
                                {member.slice(0, 2).map((item) => (
                                    <EmployeeTage key={item.employee_id} id={item.employee_id} />
                                ))}

                                <button
                                    ref={moreBtnRef}
                                    className="attendee-tag"
                                    style={{ fontSize: '18px', padding: '0px 20px', cursor: 'pointer' }}
                                    onClick={handleTogglePopover}
                                    onMouseEnter={cancelClosePopover}
                                    onMouseLeave={scheduleClosePopover}
                                >
                                    +{member.length - 2}
                                </button>

                                {isMemberPopoverOpen &&
                                    createPortal(
                                        <div
                                            ref={popoverRef}
                                            data-theme="light"
                                            className="boder member-popover-portal"
                                            onMouseEnter={cancelClosePopover}
                                            onMouseLeave={scheduleClosePopover}
                                            style={{
                                                position: 'fixed',
                                                top: `${popoverPos.top}px`,
                                                left: `${popoverPos.left}px`,
                                                transform: 'translateY(-50%)',
                                                zIndex: 9999,
                                                backgroundColor: '#fff',
                                                color: '#222',
                                                padding: '12px 14px',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '6px',
                                                width: 'max-content',
                                                maxWidth: '320px',
                                                overflow: 'visible'
                                            }}
                                        >
                                            {member.map((item) => (
                                                <EmployeeTage
                                                    key={item.employee_id}
                                                    id={item.employee_id}
                                                />
                                            ))}
                                        </div>,
                                        document.body
                                    )}
                            </div>
                        )}
                    </div>
                </section>

                <section
                    style={{
                        display: 'flex',
                        flexFlow: 'column',
                        minWidth: 0,
                        height: '500px'
                    }}
                >
                    <div style={{ display: 'flex', gap: '5px', marginBottom: "30px" }}>
                        <button
                            type="button"
                            style={{ fontSize: "13px", marginLeft: 'auto' }}
                            onClick={() => {
                                setBodyStyle(0);
                            }}
                        >
                            할 일 리스트
                        </button>

                        <button
                            type="button"
                            className="register-btn"
                            style={{ fontSize: "13px" }}
                            onClick={() => {
                                setBodyStyle(2);
                            }}
                        >
                            + 할 일 추가
                        </button>
                    </div>
                    <div>
                        {
                            bodyStyle == 0 ?
                                <ProjectDetailWorkList
                                    projectID={project.project_id}
                                    click={(index) => {
                                        setBodyStyle(1);
                                        setSelectTask(index);
                                    }}
                                /> :
                                bodyStyle == 1 ?
                                    <ProjectWorkDetail
                                        projectID={selectTask}
                                    /> :
                                    <NewWorkList projectID={project.project_id} />
                        }
                    </div>
                </section>

                <div style={{ display: 'flex' }}>
                    <button
                        type="button"
                        style={{
                            marginLeft: 'auto'
                        }}
                        onClick={() => { onClose(); }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProjectDetail;