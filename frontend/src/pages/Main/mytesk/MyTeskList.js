import React from "react";
import ADComp from "../../../components/ADComp"
import Nav from "../../../components/Nav";

function MyTeskList(){
    let mainUrl = "/main/mytesk/";
    const urlList = [
        {name:"출결관리", url:mainUrl+"/*"}
        ,{name:"기안서작성", url:mainUrl+"/corp-card"}
        ,{name:"요청된 기안서", url:mainUrl+"/bank-account"}
        ,{name:"완료된 기안서", url:mainUrl+"/approval"}
    ];
    return(
        <div className='sub-main-contain'>
            <Nav urlist={urlList}/>
            <div >
                <span className='subtitle'>출결관리</span>
                <div className="sub-container">
                    <ADComp/>
                    수정요청
                </div>
            </div>
        </div>
    )
}

export default MyTeskList;