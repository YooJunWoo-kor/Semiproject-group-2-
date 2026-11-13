import React from "react";

function NewWorkList(){
    return(
        <div className="vertical-box">
            <h4>할 일 추가</h4>
            <form
                className="vertical-box"
            >
                <div className="horizontal-box">
                    <p>제목</p>
                    <input className="size-fill"/>
                </div>
                <div className="horizontal-box">
                    <p>내용</p>
                    <input className="size-fill"/>
                </div>
                <div className="horizontal-box">
                    <div className="vertical-box size-fill">
                        <p>시작일</p>
                        <input type='date'/>
                    </div>
                    <div className="
                        vertical-box
                        size-fill"
                    >
                        <p>마감일</p>
                        <input type='date'/>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default NewWorkList;