import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Nav(props){
    /*[
        {name: "", url: ""}
        ,{name: "", url: ""}
        ...
    ]*/

    const urlist = props.urlist;
    
    return(
        <div className="sub-main-nav">
            <ul>
                {urlist.map((item)=>(
                    <li>
                        <Link to = {item.url}>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Nav;