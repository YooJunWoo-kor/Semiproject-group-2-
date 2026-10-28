import React, { useState } from "react";

function DraftCreate() {
    const [title, setTitle] = useState("");
    const [draftType, setDraftType] = useState("일반");
    const [content, setContent] = useState("");

    function handleSubmit(e) {
        e.preventDefault();

        const draftData = {
            title: title,
            draftType: draftType,
            content: content
        };
    }

    return (

        <div>
            <h2>기안서 작성</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    제목
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                </label>

                <label>
                    문서 종류

                    <select value={draftType} onChange={e => setDraftType(e.target.value)}>
                        <option>일반</option>
                        <option>휴가</option>
                        <option>구매</option>
                        <option>비용</option>
                    </select>
                </label>

                <label>
                    내용

                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                </label>


                <button type="submit">
                    기안서 등록
                </button>

            </form>
        </div>
    )
}

export default DraftCreate;