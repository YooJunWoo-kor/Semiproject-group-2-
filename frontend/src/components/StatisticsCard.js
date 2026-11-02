import React from "react";
import './StatisticsCard.css';

function StatisticsCard(props){
    return (
        <div className="content-card">
            <p style={{
                margin: 0
            }}>{props.title}</p>
            <span style={{
                fontSize: "30px",
                fontWeight: "bold",
                marginRight: 5
            }}>{props.count}</span>
            {
                props.stiyle == 1 ? ("명") : ("개")
            }
        </div>
    )
}

export default StatisticsCard;