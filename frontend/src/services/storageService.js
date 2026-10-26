export function getJson(key, fallbackValue = null) {
    const value = localStorage.getItem(key);

    if (!value) {
        return fallbackValue;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error(`localStorage parsing failed: ${key}`, error);
        return fallbackValue;
    }
}

export function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key) {
    localStorage.removeItem(key);
}
