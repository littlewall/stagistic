import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {VocalRangeSection} from './VocalRangeSection';

const mountedRoots: Root[] = [];

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const waitForElement = async <T extends Element>(root: ParentNode, selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = root.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

const render = async (element: ReactElement) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(element);
    mountedRoots.push(root);

    await waitForElement(host, 'svg');

    return host;
};

describe('VocalRangeSection', () => {
    it('initializes an empty range from every known voice type', async () => {
        const ranges = [
            [
                'soprano',
                'C4',
                'C6',
            ],
            [
                'mezzo-soprano',
                'C4',
                'A5',
            ],
            [
                'alto',
                'F3',
                'D5',
            ],
            [
                'contralto',
                'E3',
                'C5',
            ],
            [
                'countertenor',
                'G3',
                'D5',
            ],
            [
                'tenor',
                'C3',
                'C5',
            ],
            [
                'light baritone',
                'C3',
                'A4',
            ],
            [
                'baritone',
                'C3',
                'G4',
            ],
            [
                'bass-baritone',
                'C3',
                'F4',
            ],
            [
                'bass',
                'C3',
                'E4',
            ],
        ] as const;

        for (const [
            voiceType,
            low,
            high,
        ] of ranges) {
            const onSetCharacterVocalRange = vi.fn();
            const host = await render(
                <VocalRangeSection
                    character={{
                        id: voiceType,
                        voiceType: null,
                        vocalRangeLow: null,
                        vocalRangeHigh: null,
                    }}
                    onSetCharacterVocalRange={onSetCharacterVocalRange}
                />,
            );
            const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

            await page.elementLocator(input).fill(voiceType);
            input.blur();

            expect(onSetCharacterVocalRange).toHaveBeenLastCalledWith(
                voiceType,
                low,
                high,
            );
        }
    });

    it('initializes an empty range only once', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: null, vocalRangeHigh: null,
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

        await page.elementLocator(input).fill('baritone');
        input.blur();
        await page.elementLocator(input).fill('soprano');
        input.blur();

        expect(onSetCharacterVocalRange).toHaveBeenCalledTimes(1);
        expect(onSetCharacterVocalRange).toHaveBeenLastCalledWith('char-1', 'C3', 'G4');
    });

    it('edits voice type without touching the range', async () => {
        const onSetCharacterVoiceType = vi.fn();
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: 'C3', vocalRangeHigh: 'A4',
                }}
                onSetCharacterVoiceType={onSetCharacterVoiceType}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

        await page.elementLocator(input).fill('tenor');
        input.blur();

        expect(onSetCharacterVoiceType).toHaveBeenLastCalledWith('char-1', 'tenor');
        expect(onSetCharacterVocalRange).not.toHaveBeenCalled();
    });

    it('does not initialize a partially stored range', async () => {
        for (const [low, high] of [['C3', null], [null, 'A4']] as const) {
            const onSetCharacterVocalRange = vi.fn();
            const host = await render(
                <VocalRangeSection
                    character={{
                        id: `char-${String(low)}-${String(high)}`,
                        voiceType: null,
                        vocalRangeLow: low,
                        vocalRangeHigh: high,
                    }}
                    onSetCharacterVocalRange={onSetCharacterVocalRange}
                />,
            );
            const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

            await page.elementLocator(input).fill('soprano');
            input.blur();

            expect(onSetCharacterVocalRange).not.toHaveBeenCalled();
        }
    });

    it('does not initialize a range for a custom voice type', async () => {
        const onSetCharacterVoiceType = vi.fn();
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: null, vocalRangeHigh: null,
                }}
                onSetCharacterVoiceType={onSetCharacterVoiceType}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

        await page.elementLocator(input).fill('dramatic coloratura');
        input.blur();

        expect(onSetCharacterVoiceType).toHaveBeenLastCalledWith('char-1', 'dramatic coloratura');
        expect(onSetCharacterVocalRange).not.toHaveBeenCalled();
    });

    it('does not overwrite a manual range edit before the parent rerenders', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: null, vocalRangeHigh: null,
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');

        await page.elementLocator(lowHeader).click();

        const octaveUp = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        await page.elementLocator(octaveUp).click();

        const input = await waitForElement<HTMLInputElement>(host, '[role="combobox"]');

        await page.elementLocator(input).fill('soprano');
        input.blur();

        expect(onSetCharacterVocalRange).toHaveBeenCalledTimes(1);
        expect(onSetCharacterVocalRange).toHaveBeenLastCalledWith('char-1', 'C4', 'A4');
    });

    it('raises the low note while keeping the high note unchanged', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: 'tenor', vocalRangeLow: 'C3', vocalRangeHigh: 'A4',
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');

        await page.elementLocator(lowHeader).click();

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        await page.elementLocator(button).click();

        expect(onSetCharacterVocalRange).toHaveBeenCalledWith('char-1', 'C4', 'A4');
    });

    it('does not show a reset action when a range is set', async () => {
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: 'C3', vocalRangeHigh: 'A4',
                }}
            />,
        );

        expect(host.querySelector('[data-clear-range]')).toBeNull();
    });

    it('shows the default notes when no range is set', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: null, vocalRangeHigh: null,
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );

        expect(host.querySelector('[data-clear-range]')).toBeNull();
        expect(host.querySelector('[aria-label="Edit low note C3"]')).not.toBeNull();
        expect(host.querySelector('[aria-label="Edit high note A4"]')).not.toBeNull();
        expect(host.querySelectorAll('[data-notehead]')).toHaveLength(2);
        expect(onSetCharacterVocalRange).not.toHaveBeenCalled();
    });

    it('persists both defaults on the first range edit', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = await render(
            <VocalRangeSection
                character={{
                    id: 'char-1', voiceType: null, vocalRangeLow: null, vocalRangeHigh: null,
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');

        await page.elementLocator(lowHeader).click();

        const octaveUp = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        await page.elementLocator(octaveUp).click();

        expect(onSetCharacterVocalRange).toHaveBeenCalledWith('char-1', 'C4', 'A4');
    });

    it('cancels active interaction when the selected character changes', async () => {
        const onSetCharacterVocalRange = vi.fn();
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        mountedRoots.push(root);
        root.render(
            <VocalRangeSection
                character={{
                    id: 'char-a', voiceType: null, vocalRangeLow: 'C3', vocalRangeHigh: 'A4',
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );

        const oldNote = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');

        vi.spyOn(oldNote, 'setPointerCapture').mockImplementation(() => undefined);
        oldNote.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, pointerId: 1, button: 0, clientY: 0,
        }));
        await waitForElement(host, '[data-dragging]');

        root.render(
            <VocalRangeSection
                character={{
                    id: 'char-b', voiceType: null, vocalRangeLow: 'D3', vocalRangeHigh: 'B4',
                }}
                onSetCharacterVocalRange={onSetCharacterVocalRange}
            />,
        );
        await waitForElement(host, '[aria-label="Edit low note D3"]');

        oldNote.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId: 1, button: 0, clientY: 0,
        }));

        expect(host.querySelector('[data-dragging]')).toBeNull();
        expect(host.querySelector('[data-note-editor]')).toBeNull();
        expect(onSetCharacterVocalRange).not.toHaveBeenCalled();
    });
});
