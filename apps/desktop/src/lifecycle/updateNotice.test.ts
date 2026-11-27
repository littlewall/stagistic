import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createUpdateController} from './updateController';
import {
    createUpdateNoticeController,
    DEFAULT_NOTICE_MESSAGE,
    DOWNLOAD_URL,
    parseUpdateNotice,
} from './updateNotice';

describe('parseUpdateNotice', () => {
    it('accepts the minimum shape', () => {
        expect(parseUpdateNotice({minimumRelease: '1.0.0'})).toEqual({
            minimumRelease: '1.0.0',
            message: DEFAULT_NOTICE_MESSAGE,
            url: DOWNLOAD_URL,
        });
    });

    it('keeps a plain-text message and a stagistic.com url', () => {
        expect(parseUpdateNotice({
            minimumRelease: '1.2.3',
            message: '<b>Update</b> now',
            url: 'https://stagistic.com/download/mac',
        })).toEqual({
            minimumRelease: '1.2.3',
            message: '<b>Update</b> now',
            url: 'https://stagistic.com/download/mac',
        });
    });

    it.each([
        'https://evil.example/',
        'http://stagistic.com/download',
        'https://stagistic.com.evil.example/',
        'https://stagistic.com@evil.example/',
        'javascript:alert(1)',
        42,
    ])('falls back to the download page for url %s', url => {
        expect(parseUpdateNotice({minimumRelease: '1.0.0', url})?.url).toBe(DOWNLOAD_URL);
    });

    it('falls back to the default message for an empty or non-string message', () => {
        expect(parseUpdateNotice({minimumRelease: '1.0.0', message: '  '})?.message).toBe(DEFAULT_NOTICE_MESSAGE);
        expect(parseUpdateNotice({minimumRelease: '1.0.0', message: 7})?.message).toBe(DEFAULT_NOTICE_MESSAGE);
    });

    it.each([
        null,
        '<html></html>',
        [],
        {},
        {minimumRelease: 1},
        {minimumRelease: '1.0'},
        {minimumRelease: 'v1.0.0'},
        {minimumRelease: '1.0.0-beta'},
    ])('ignores invalid notice %j', value => {
        expect(parseUpdateNotice(value)).toBeNull();
    });
});

const setup = (fetchNotice: () => Promise<unknown>, release = '0.9.0') => {
    const controller = createUpdateNoticeController({fetchNotice}, release);

    return controller;
};

describe('update notice controller', () => {
    it('shows the notice when the running Release is older', async () => {
        const controller = setup(() => Promise.resolve({minimumRelease: '1.0.0'}));

        await controller.refresh();
        expect(controller.getState().visible).toBe(true);
        expect(controller.getState().notice?.message).toBe(DEFAULT_NOTICE_MESSAGE);
    });

    it.each(['1.0.0', '1.0.1'])('stays hidden for running Release %s', async release => {
        const controller = setup(() => Promise.resolve({minimumRelease: '1.0.0'}), release);

        await controller.refresh();
        expect(controller.getState().visible).toBe(false);
    });

    it('hides until the next start, even after a later refresh', async () => {
        const controller = setup(() => Promise.resolve({minimumRelease: '1.0.0'}));

        await controller.refresh();
        controller.hide();
        expect(controller.getState().visible).toBe(false);
        await controller.refresh();
        expect(controller.getState().visible).toBe(false);
    });

    it('ignores fetch failures and invalid bodies without a state change', async () => {
        let next: () => Promise<unknown> = () => Promise.resolve({minimumRelease: '1.0.0'});
        const controller = setup(() => next());

        await controller.refresh();

        const before = controller.getState();

        next = () => Promise.reject(new Error('offline'));
        await controller.refresh();
        next = () => Promise.resolve('<html></html>');
        await controller.refresh();
        expect(controller.getState()).toBe(before);
    });

    it('clears the notice when the server no longer requires an update', async () => {
        let body: unknown = {minimumRelease: '1.0.0'};
        const controller = setup(() => Promise.resolve(body));

        await controller.refresh();
        body = {minimumRelease: '0.9.0'};
        await controller.refresh();
        expect(controller.getState().visible).toBe(false);
    });
});

describe('notice schedule', () => {
    it('is fetched with every update check, even when the updater fails', async () => {
        let fetches = 0;
        const notice = createUpdateNoticeController({
            fetchNotice: () => {
                fetches += 1;

                return Promise.resolve({minimumRelease: '1.0.0'});
            },
        }, '0.9.0');
        const controller = createUpdateController({
            checkForUpdate: () => Promise.reject(new Error('updater down')),
            isOnline: () => true,
            now: () => new Date(),
            setTimer: () => 0,
            clearTimer: () => undefined,
            reportError: () => undefined,
        }, {
            requestRestart: () => Promise.resolve('completed'),
            onCheck: () => void notice.refresh(),
        });

        await controller.checkInBackground();
        await Promise.resolve();
        expect(fetches).toBe(1);
        expect(controller.getState().status).toBe('failed');
        expect(notice.getState().visible).toBe(true);
    });

    it('is skipped together with the update check when offline', async () => {
        let fetches = 0;
        const controller = createUpdateController({
            checkForUpdate: () => Promise.resolve(null),
            isOnline: () => false,
            now: () => new Date(),
            setTimer: () => 0,
            clearTimer: () => undefined,
        }, {
            requestRestart: () => Promise.resolve('completed'),
            onCheck: () => {
                fetches += 1;
            },
        });

        await controller.checkInBackground();
        expect(fetches).toBe(0);
    });
});
