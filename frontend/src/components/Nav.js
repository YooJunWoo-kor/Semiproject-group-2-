import React from "react";
import { NavLink } from "react-router-dom";

//기본 공통 네비

function Nav(props){
    /*[
        {name: "", url: ""}
        ,{name: "", url: ""}
        ...
    ]*/

    const urlist = props.urlist;

    return(
        <div className="sub-border">
            <p>{props.title}</p>
            <nav className="sub-main-nav">
                {urlist.map((item)=>(
                        <NavLink key={item.url} to = {item.url} end>
                            {item.name}
                        </NavLink>
                ))}
            </nav>
        </div>
    )
}

export default Nav;