import React from "react";

// 기본 테이블 모듈
function BasicTable({ title, th, td = [] }) {
    const headers = th ?? ["메뉴1", "메뉴2", "메뉴3", "메뉴4", "메뉴5"];
    const rows = Array.isArray(td) ? td : [];

    return (
        <div className="attendance-card" style={{
            maxWidth: "100%",
            paddingBottom: "30px"
        }}>
            <h4 style={{ marginBottom: "0px" }}>{title ?? "테이블제목"}</h4>
            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            {th.map((item, index)=>(
                                <th key={index}>{item}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {!td ?
                            <tr
                                style={{
                                    height:'200px'
                                }}
                            ><td
                                colSpan={th.length}
                                style={{
                                    textAlign: 'center'

                                }}
                            >등록된 정보가 없습니다.</td></tr>

                            : td.map((item)=>{
                                return <tr>{item.content.map((item, index)=>(
                                    <td
                                        key={index}
                                        style={{
                                            fontSize:"13"
                                    }}>{item}</td>
                                ))}</tr>
                        })}
                    </tbody>

                </table>
            </div>
        </div>
    );
}

export default BasicTable;
