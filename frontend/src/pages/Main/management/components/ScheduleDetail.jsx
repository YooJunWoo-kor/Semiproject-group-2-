import React from 'react';

function ScheduleDetail({
    selectedSchedule,
    onClose,
    onEdit,
    onDelete
}) {

    // 선택한 일정이 없으면 상세보기를 표시하지 않음
    if (!selectedSchedule) {
        return null;
    }

    // 참석자 목록
    const attendees = (selectedSchedule.attendees || []).map(person => {

        // 참석자가 이름만 저장된 경우
        if (typeof person === 'string') {
            return person;
        }

        // 참석자 이름과 상태가 저장된 경우
        return `${person.name}(${person.status})`;

    }).join(', ') || '없음';

    // 수정 버튼
    function handleEdit() {
        if (onEdit) {
            onEdit(selectedSchedule.id);
        }
    }

    // 삭제 버튼
    function handleDelete() {

        const confirmed = window.confirm('일정을 삭제할까요?');

        if (confirmed) {

            // 선택한 일정 삭제
            if (onDelete) {
                onDelete(selectedSchedule.id);
            }

            // 상세보기 닫기
            if (onClose) {
                onClose();
            }
        }
    }

    return (
        <section className="schedule-dialog">

            <h2>{selectedSchedule.title}</h2>

            {/* 일정 상세정보 */}
            <table className="schedule-detail-table">
                <tbody>

                    <tr>
                        <th>유형</th>
                        <td>{selectedSchedule.type || '-'}</td>
                    </tr>

                    <tr>
                        <th>상태</th>
                        <td>{selectedSchedule.status || '-'}</td>
                    </tr>

                    <tr>
                        <th>우선순위</th>
                        <td>{selectedSchedule.priority || '-'}</td>
                    </tr>

                    <tr>
                        <th>담당 부서</th>
                        <td>{selectedSchedule.department || '-'}</td>
                    </tr>

                    <tr>
                        <th>담당자</th>
                        <td>{selectedSchedule.manager || '-'}</td>
                    </tr>

                    <tr>
                        <th>시작일</th>
                        <td>
                            {selectedSchedule.startDate || '-'}
                            {selectedSchedule.startTime
                                ? ` ${selectedSchedule.startTime}`
                                : ''}
                        </td>
                    </tr>

                    <tr>
                        <th>종료일</th>
                        <td>
                            {selectedSchedule.endDate || '-'}
                            {selectedSchedule.endTime
                                ? ` ${selectedSchedule.endTime}`
                                : ''}
                        </td>
                    </tr>

                    {/* 모든 일정 유형에서 표시 */}
                    <tr>
                        <th>회의실 / 장소</th>
                        <td>
                            {selectedSchedule.room || '선택된 회의실 없음'}
                        </td>
                    </tr>

                    <tr>
                        <th>참석자</th>
                        <td>{attendees}</td>
                    </tr>

                    <tr>
                        <th>설명</th>
                        <td>{selectedSchedule.description || '없음'}</td>
                    </tr>

                </tbody>
            </table>

            {/* 상세보기 버튼 */}
            <div className="schedule-detail-actions">

                <button
                    type="button"
                    onClick={onClose}
                >
                    닫기
                </button>

                <button
                    type="button"
                    onClick={handleEdit}
                >
                    수정
                </button>

                <button
                    type="button"
                    onClick={handleDelete}
                >
                    삭제
                </button>

            </div>

        </section>
    );
}

export default ScheduleDetail;
