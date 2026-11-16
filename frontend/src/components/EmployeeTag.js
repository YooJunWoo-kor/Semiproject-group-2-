import axios from "axios";
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/authStorage";

function EmployeeTage({id}){

    const [member, setMember] = useState(null);

    const getMember = async()=>{
        let data = await axios.post(
          API_BASE_URL+'/project/get_employee',
          {employee_id : id}
        );
        console.log(data.data.data[0]);
        setMember( data.data.data[0]);
    }

    useEffect(()=>{
        getMember();
    },[])

    return(
        <button key={id} className="attendee-tag">
            <strong style={{ fontSize: "14px" }}>
                {member && member.name}
            </strong>
            <span style={{ fontSize: "12px", marginTop: "2px", paddingRight: "5px"}}>
                {member && member.position}
            </span>
            <div
                className="boder vertical-box"
                style={{
                    position:"absolute",
                    width: "100px",
                    height: "50px",
                    right: "-100px",
                    zIndex: "999",
                    top: "0",
                    color: 'black'
            }}>
                {member && member.name}
            </div>
        </button>
    );
}

export default EmployeeTage;