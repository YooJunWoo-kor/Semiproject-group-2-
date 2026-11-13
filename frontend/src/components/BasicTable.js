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
                            {headers.map((heading, index) => (
                                <th key={index}>{heading}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr style={{ height: "200px" }}>
                                <td colSpan={headers.length} style={{ textAlign: "center" }}>
                                    등록된 정보가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, rowIndex) => (
                                <tr key={row.id ?? rowIndex}>
                                    {(row.content || []).map((cell, cellIndex) => (
                                        <td key={cellIndex} style={{ fontSize: "13px" }}>
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BasicTable;
