import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createUnsavedWorkMark,
    hasUnsavedWork,
    installUnsavedWorkWarning,
} from './unsavedWork';

describe('unsaved work', () => {
    it('is present while any mark is set', () => {
        const first = createUnsavedWorkMark();
        const second = createUnsavedWorkMark();

        expect(hasUnsavedWork()).toBe(false);

        first(true);
        second(true);
        first(false);
        expect(hasUnsavedWork()).toBe(true);

        second(false);
        expect(hasUnsavedWork()).toBe(false);
    });

    it('counts a mark once however often it is set', () => {
        const mark = createUnsavedWorkMark();

        mark(true);
        mark(true);
        mark(false);
        expect(hasUnsavedWork()).toBe(false);
    });

    describe('the leave-site warning', () => {
        const target = () => {
            const listeners = new Set<(event: {preventDefault: () => void, returnValue?: string}) => void>();

            return {
                addEventListener: vi.fn((_type: string, listener: never) => listeners.add(listener)),
                removeEventListener: vi.fn((_type: string, listener: never) => listeners.delete(listener)),
                ask: () => {
                    const event = {preventDefault: vi.fn(), returnValue: undefined as string | undefined};

                    listeners.forEach(listener => listener(event));

                    return event.preventDefault.mock.calls.length > 0;
                },
                size: () => listeners.size,
            };
        };

        it('asks only while some owner holds unsaved work, through one listener', () => {
            const window = target();
            const remove = installUnsavedWorkWarning(window as never);
            const mark = createUnsavedWorkMark();

            expect(window.ask()).toBe(false);
            mark(true);
            expect(window.ask()).toBe(true);
            mark(false);
            expect(window.ask()).toBe(false);
            expect(window.size()).toBe(1);
            remove();
            expect(window.size()).toBe(0);
        });

        it('never asks in the desktop shell', () => {
            const window = target();
            const mark = createUnsavedWorkMark();

            installUnsavedWorkWarning(window as never);
            Reflect.set(globalThis, 'isTauri', true);
            mark(true);

            try {
                expect(window.ask()).toBe(false);
            } finally {
                Reflect.deleteProperty(globalThis, 'isTauri');
                mark(false);
            }
        });
    });
});
