export const isApplePlatform = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const platform: unknown = Reflect.get(navigator, 'platform') || Reflect.get(navigator, 'userAgent');

    return typeof platform === 'string' && (/mac|iphone|ipad|ipod/i).test(platform);
};
