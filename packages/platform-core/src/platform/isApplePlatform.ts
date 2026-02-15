export const isApplePlatform = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const platform = navigator.platform || navigator.userAgent;

    return (/mac|iphone|ipad|ipod/i).test(platform);
};
