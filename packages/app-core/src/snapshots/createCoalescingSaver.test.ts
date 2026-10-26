import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createCoalescingSaver} from './createCoalescingSaver';

describe('createCoalescingSaver', () => {
    it('collapses requests made during a save into one more save', async () => {
        let release: () => void = () => undefined;
        const save = vi.fn(() => new Promise<void>(resolve => {
            release = resolve;
        }));
        const saver = createCoalescingSaver(save, vi.fn());

        saver.request();
        saver.request();
        saver.request();

        expect(save).toHaveBeenCalledOnce();

        release();
        await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
        release();
        await saver.flush();

        expect(save).toHaveBeenCalledTimes(2);
    });

    it('reports a failed save and keeps saving later requests', async () => {
        const onError = vi.fn();
        const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);
        const saver = createCoalescingSaver(save, onError);

        saver.request();
        await saver.flush();
        saver.request();
        await saver.flush();

        expect(onError).toHaveBeenCalledOnce();
        expect(save).toHaveBeenCalledTimes(2);
    });
});
