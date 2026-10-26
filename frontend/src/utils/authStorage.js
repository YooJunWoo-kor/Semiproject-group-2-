export function saveLoginUser(user){
    localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
    );
}

export function getLoginUser(){
    const user = localStorage.getItem("loginUser");

    if(!user){
        return null;
    }

    return JSON.parse(user)
}

export function logoutUser(){
    localStorage.removeItem("loginUser");
}