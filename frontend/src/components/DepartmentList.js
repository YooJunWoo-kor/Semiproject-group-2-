import React, { useEffect, useState } from "react";

import DepEmpList from './DepEmpList';
import axios from "axios";
import { API_BASE_URL } from "../utils/authStorage";

function DepartmentList({listset, onClose}){
    //방어코드라는데..... 복잡함 일단 참고
    const close = typeof onClose == 'function' ? onClose : ()=>{alert('함수추가하거라')};
    listset = listset ? listset : ()=>{};
  
    const [departList, setDepartList] = useState([]);
    const [currntDf, setCurrntDf] = useState('');
    const [onSelect, setOnSelect] = useState('');
  
    const setDepart = async function(){
      try{
        const data = await axios.get(API_BASE_URL + '/drafts/departments');
        setDepartList(data.data);
      }catch(err){
        console.log(err.data);
      }
    }
  
    useEffect(()=>{
      setDepart();
    },[]);
  
    return(
      <div style={{padding: "0 20px", paddingBottom: "50px"}}>
        <div style={{display:"flex", fontSize: "13px", gap: "5px"}}>
          <div style={{display: 'flex', flexFlow: 'column', gap: '5px', minWidth: '110px'}}>
            <p>부서</p>
            {departList.map((item, index)=>(
              <button type='button' key={index} onClick={()=>{
                setCurrntDf(item.department_name);
                console.log(currntDf);
                }}>
                {item.department_name}
              </button>
            ))}
          </div>
          <span style={{width: '1px', backgroundColor: '#ddd', margin:'0px 10px'}}/>
          <div style={{display: 'flex', flexFlow: 'column'}}>
            <DepEmpList departmentName = {currntDf} onSelect={setOnSelect}/>
          </div>
        </div>
        <div style={{marginTop:'30px'}}>
          <button
            type='button'
            onClick={()=>{
              console.log(onSelect);
              listset(onSelect);
            }}
          >추가</button>
          {/* 상단 엑스버튼이랑 동기화 시키려면 조금 복잡해질 수 있어서 일단 보류 */}
          {/* <button onClick={()=>{close()}}>완료</button>  */}
        </div>
        
      </div>
    )
  }

  export default DepartmentList;