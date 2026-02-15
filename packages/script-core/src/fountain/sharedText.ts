export const isAllCaps = (value: string) => {
    const letters = value.replace(/[^A-Za-z]/g, '');

    return letters.length > 0 && letters === letters.toUpperCase();
};

export const uppercaseOutsideParentheses = (value: string) => {
    let inside = false;
    let result = '';

    for (const char of value) {
        if (char === '(') {
            inside = true;
            result += char;
            continue;
        }

        if (char === ')') {
            inside = false;
            result += char;
            continue;
        }

        result += inside ? char : char.toUpperCase();
    }

    return result;
};
