import React from "react";

//기본테이블 모듈

function BasicTable({title, th, td}){
    th = th == null ? ["메뉴1","메뉴2","메뉴3","메뉴4","메뉴5",] : th;
    td = td.length == 0 ? false : td;

    title = title == null ? "테이블제목" : title;

    return(
        <div className="attendance-card" style = {{
            maxWidth:"100%",
            paddingBottom:"30px"
        }}>
            <h4 style={{marginBottom:"0px"}}>{title}</h4>
            <div className="table-shell">
                <table>
                    <tr>
                        {th.map((item)=>(
                            <th>{item}</th>
                        ))}
                    </tr>

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
                            return <tr>{item.content.map((item)=>(
                                <td style={{
                                    fontSize:"13"
                                }}>{item}</td>
                            ))}</tr>
                    })}
                </table>
            </div>
        </div>
    )
}

export default BasicTable;