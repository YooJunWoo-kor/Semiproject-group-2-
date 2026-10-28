import { getJson, removeItem, setJson } from "./storageService";

const LOGIN_USER_KEY = "loginUser";

export function saveLoginUser(user) {
    setJson(LOGIN_USER_KEY, user);
}

export function getLoginUser() {
    return getJson(LOGIN_USER_KEY, null);
}

export function logoutUser() {
    removeItem(LOGIN_USER_KEY);
}
