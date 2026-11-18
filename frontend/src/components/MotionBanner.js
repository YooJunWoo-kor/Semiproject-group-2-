import React, { useEffect, useRef, useState } from "react";

function MotionBanner(){
    
    const positionRef = useRef(0.0);
    const [position,setPosition] = useState(0);
    const speed = useRef(0);

    const FPS = 30;
    const frame = 1000/FPS;

    useEffect(()=>{
            const timer = setInterval(()=>{
                const dt = frame / 1000;    // 델타타임
                const targetPosition = 50;  // 타겟포지션
                const maxSpeed = 400;       // 최고 속도
                const accel = 800;          // 초반 가속
                const brakeDistance = 120;  // 브레이크 지점

                const remaining = targetPosition - positionRef.current;

                if (remaining <= brakeDistance) {
                    //감속
                    speed.current = Math.max(20, (remaining / brakeDistance) * maxSpeed);
                } else {
                    //가속
                    speed.current = Math.min(maxSpeed, speed.current + accel * dt);
                }

                positionRef.current += speed.current * dt;
                setPosition(positionRef.current);

                // 목표 도달 시 고정 후 종료
                if (positionRef.current >= targetPosition) {
                    positionRef.current = targetPosition;
                    setPosition(targetPosition);
                    clearInterval(timer);
                }
            }, frame);

            return ()=> clearInterval(timer);
        }, []);

    return(
        <div className="boder" style={{position: 'absolute', bottom:position, right:'30px', maxWidth:'300px', minWidth:'200px', minHeight:'100px'}}>
            <header style={{marginLeft:'auto'}}>x</header>
            <div>알림창 바디</div>
            <button>
                <filter id="my-shader">
                    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
                    확인
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </button>
        </div>
    )
}

export default MotionBanner;