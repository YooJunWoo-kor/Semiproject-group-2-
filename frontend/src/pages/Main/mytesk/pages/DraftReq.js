import React from "react";

function DraftReq( {drafts} ){
    return(
        <div>
            <h2>요청된 기안서</h2>

            {drafts.length === 0 ? (
                <p>요청된 기안서가 없습니다.</p>
            ) : (
                drafts.map(function(draft, index) {
                    return (
                        <div key={index}>
                            <p>제목 : {draft.title}</p>
                            <p>문서 종류 : {draft.draftType}</p>
                            <p>내용 : {draft.content}</p>
                        </div>
                    );
                })

            )}

            요청한 기안
        </div>
    )
}

export default DraftReq;