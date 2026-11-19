import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ModalBase from "./ModalBase";
import DepEmpList from "./DepEmpList";
import axios from "axios";
import { API_BASE_URL } from "../utils/authStorage";
import { saveLoginUser } from "../utils/authStorage";

//헤더모듈

function HeaderNav() {
    //  페이지 이동 기능 사용
    const navigate = useNavigate();
    // 로그아웃 함수 정의
    const handleLogout = () => {
        localStorage.removeItem("loginUser");
        alert('로그아웃 되었습니다.');
        navigate('/');
    };

    const [ShowAccountModal, setShowAccountModal] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    


    useEffect(() => {
        if (!ShowAccountModal) return;

        const loadDepartments = async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/drafts/departments`
                );

                setDepartments(
                    response.data.map(item => item.department_name)
                );
            } catch (err) {
                console.error("부서 조회 실패:", err);
            }
        };

        loadDepartments();
    }, [ShowAccountModal]);

    //유저데이터 겟
    function getLoginUser() {
        const LOGIN_USER_KEY = "loginUser";
        const savedUser = localStorage.getItem(LOGIN_USER_KEY);
        // 저장된 데이터가 없으면 null 반환, 있으면 파싱해서 객체로 반환
        if (!savedUser) {
            return null;
        }
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            console.error("로그인 정보 파싱 실패:", error);
            return null;
        }
    }

    // 위의 함수로 유저정보를 받아옴
    const user = getLoginUser();
    // 유저의 전체 이름 저장

    const isMaster = Number(user?.employeeKey) === 9999;
    const departmentName = user?.departmentName;

    const showHr = isMaster || departmentName === '인사팀';
    const showFinance = isMaster || departmentName === '재무팀';
    const showQuality = isMaster || departmentName === '제품개발부서';

    const userName = user?.name || user?.userName || "사용자";
    // 유저의 첫글자 저장
    const userFName = userName[0];

    // 디버깅용 consol창

    const handleChangeAccount = () => {
        if(!selectedEmployee) {
            alert("직원을 선택해주세요.");
            return;
        }

        saveLoginUser({
            employeeKey: selectedEmployee.employee_id,
            name: selectedEmployee.name,
            email: selectedEmployee.email,
            departmentName: selectedEmployee.department_name,
            department: selectedEmployee.department_id,
            position: selectedEmployee.position,
            role: selectedEmployee.role
        })

        window.location.replace("/main"); // 계정전환 후 main으로 이동
    }



    return (
        <div>
            <nav className="erp-top-nav" aria-label="ERP 주 메뉴">
                <NavLink to="/main" end>대시보드</NavLink>
                {showHr && <NavLink to="/main/hr">인사</NavLink>}
                {showFinance && <NavLink to="/main/finance">재무</NavLink>}
                {showQuality && <NavLink to="/main/qa">품질</NavLink>}
                <NavLink to="/main/schedule">일정</NavLink>
                <NavLink to="/main/project">프로젝트</NavLink>
                {/* <NavLink to="/main/crm">고객관리</NavLink> */}
                <NavLink to="/main/community">커뮤니티</NavLink>

                <NavLink to="/main/mytesk" className='mypage-link'>내업무 관리</NavLink>
                <div className="erp-header-user">
                    {/* 접속자 클릭 시 마이페이지 이동 */}
                    <NavLink to="/main/profile" className="profil-icon">
                        {userFName}
                    </NavLink>

                    <div className="hoverList">
                        <ul>
                            <li><Link to="/main/profile">마이페이지</Link></li>
                            <li><Link to="/main/mytesk">내업무 관리</Link></li>
                            <li><button type="button" className="account-change-btn" onClick={() => setShowAccountModal(true)}>계정 전환</button></li>
                            <li>
                                <button type="button" onClick={handleLogout}>
                                    로그아웃
                                </button>
                            </li>
                        </ul>

                    </div>
                </div>
            </nav>
            {ShowAccountModal && (
                <ModalBase
                    title="계정 전환"
                    onClose={() => {
                        setShowAccountModal(false);
                        setSelectedDepartment("");
                        setSelectedEmployee(null);
                    }}
                    layout={
                        <div className="draft-box">
                            <h4>부서 선택</h4>

                            <div className="draft-row">
                                {departments.map(department => (
                                    <button
                                        key={department}
                                        type="button"
                                        onClick={() => {
                                            setSelectedDepartment(department);
                                            setSelectedEmployee(null);
                                        }}
                                    >
                                        {department}
                                    </button>
                                ))}
                            </div>

                            {selectedDepartment && (
                                <DepEmpList
                                    departmentName={selectedDepartment}
                                    onSelect={setSelectedEmployee}
                                />
                            )}

                            {selectedEmployee && (
                                <p>
                                    선택한 직원: {selectedEmployee.position} {selectedEmployee.name}
                                </p>
                            )}

                            <div className="draft-actions">
                                <button className="erp-primary-button" onClick={handleChangeAccount} disabled={!selectedEmployee}>
                                    계정전환
                                </button>
                            </div>

                        </div>

                    }
                />
            )}
        </div>
    )
}

export default HeaderNav;
