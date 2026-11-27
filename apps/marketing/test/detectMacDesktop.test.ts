import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {detectMacDesktop, type SystemHints} from '../src/lib/detectMacDesktop';

const safariOnMac: SystemHints = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 0,
};

describe('detectMacDesktop', () => {
    it('recognises Safari and Firefox on a Mac', () => {
        expect(detectMacDesktop(safariOnMac)).toBe(true);
        expect(detectMacDesktop({
            ...safariOnMac,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0',
        })).toBe(true);
    });

    it('recognises Chromium on a Mac through user agent data', () => {
        expect(detectMacDesktop({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
            platform: 'MacIntel',
            userAgentDataPlatform: 'macOS',
            userAgentDataMobile: false,
            maxTouchPoints: 0,
        })).toBe(true);
    });

    it('rejects an iPad that asks for the desktop site', () => {
        expect(detectMacDesktop({...safariOnMac, maxTouchPoints: 5})).toBe(false);
    });

    it('rejects iPhone and Android', () => {
        expect(detectMacDesktop({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
            platform: 'iPhone',
            maxTouchPoints: 5,
        })).toBe(false);
        expect(detectMacDesktop({
            userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
            platform: 'Linux armv81',
            userAgentDataPlatform: 'Android',
            userAgentDataMobile: true,
            maxTouchPoints: 5,
        })).toBe(false);
    });

    it('rejects Windows and Linux desktops', () => {
        expect(detectMacDesktop({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
            platform: 'Win32',
            userAgentDataPlatform: 'Windows',
            maxTouchPoints: 0,
        })).toBe(false);
        expect(detectMacDesktop({
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
            platform: 'Linux x86_64',
            maxTouchPoints: 0,
        })).toBe(false);
    });
});
