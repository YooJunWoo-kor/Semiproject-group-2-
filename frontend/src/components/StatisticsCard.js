import React, { useEffect, useState } from "react";
import { TOGLE_COLORS } from '../utils/authStorage'

function StatisticsCard(props){
    const ANIMATION_DURATION = 800; //애니메이션 속도

    const targetCount = Number(props.count) || 0;
    const [displayCount, setDisplayCount] = useState(0);

    useEffect(()=>{
        let frame;
        const startedAt = performance.now();

        const animate = (currentTime)=>{
            const progress = Math.min((currentTime - startedAt)) / ANIMATION_DURATION;
            const easedProgress = 1 - Math.pow(1-progress,3);
            setDisplayCount(Math.round(targetCount * easedProgress));
            if(progress < 1){
                frame = requestAnimationFrame(animate);
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);

    }, [targetCount]);

    const color = TOGLE_COLORS[props.stiyle];

    return (
        <div className="content-card">
            <div style={{backgroundColor:color, height: '5px', width: '100%'}}></div>
            <div style={{padding: '15px'}}>
                <p style={{
                    margin: 0
                }}>{props.title}</p>
                <span style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                    marginRight: 5,
                    fontVariantNumeric: "tabular-nums" //너비흔들림 방지.
                }}>{displayCount}</span>
                {
                    props.stiyle == 0 ? ("개"):
                    props.stiyle == 1 ? ("명"):
                    props.stiyle == 2 ? ("만원") :
                    props.stiyle == 3 ? ("일") : ("")
                }
            </div>
        </div>
    )
}

export default StatisticsCard;