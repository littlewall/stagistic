import {parsePitch} from '@stagistic/script';
import {
    type ReactElement, useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {VocalRangeStaff} from './VocalRangeStaff';

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

const selectRangeHeader = async (host: HTMLElement, which: 'low' | 'high', pitch: string) => {
    const button = await waitForElement<HTMLButtonElement>(host, `[aria-label="Edit ${which} note ${pitch}"]`);

    await page.elementLocator(button).click();
};

const STAFF_VIEWBOX_HEIGHT = 116;

const dragNoteToPosition = async (
    host: HTMLElement,
    note: SVGGElement,
    position: number,
    pointerId = 1,
) => {
    const svg = await waitForElement<SVGSVGElement>(host, 'svg');
    const sourcePosition = Number(note.getAttribute('data-staff-position'));
    const sourceClientY = 18 + (12 - sourcePosition) * 5;
    const clientY = 18 + (12 - position) * 5;

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        right: 316,
        bottom: STAFF_VIEWBOX_HEIGHT,
        left: 0,
        width: 316,
        height: STAFF_VIEWBOX_HEIGHT,
        toJSON: () => ({}),
    });

    const capture = vi.spyOn(note, 'setPointerCapture').mockImplementation(() => undefined);
    const release = vi.spyOn(note, 'releasePointerCapture').mockImplementation(() => undefined);

    note.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, pointerId, button: 0, clientY: sourceClientY,
    }));
    note.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerId, buttons: 1, clientY,
    }));

    await waitForElement(host, '[data-dragging]');

    return {
        capture, clientY, pointerId, release,
    };
};

describe('VocalRangeStaff interactive editing', () => {
    it('reveals selected-note controls only after selecting a range header', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={() => {}}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');

        expect(lowHeader.querySelector('strong')?.textContent).toBe('C3');
        expect(host.querySelector('[data-note-editor]')).toBeNull();

        await page.elementLocator(lowHeader).click();

        const footer = await waitForElement<HTMLElement>(host, '[data-note-editor]');
        const actionLabels = [...footer.querySelectorAll('button')]
            .map(button => button.getAttribute('aria-label') ?? button.textContent?.trim());

        expect(lowHeader.getAttribute('aria-pressed')).toBe('true');
        expect(actionLabels).toEqual([
            'Octave down',
            'Octave up',
            'Flat',
            'Sharp',
        ]);
        expect(footer.textContent).not.toContain('C3');
    });

    it('exposes interactive notes as selectable controls in the accessibility tree', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={() => {}}
            />,
        );
        const staff = await waitForElement<SVGSVGElement>(host, 'svg');
        const lowNote = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');

        expect(staff.getAttribute('role')).toBe('group');
        expect(lowNote.getAttribute('aria-pressed')).toBe('false');

        await page.elementLocator(lowNote).click();

        expect(lowNote.getAttribute('aria-pressed')).toBe('true');
    });

    it('selects a note directly on the staff for subsequent edits', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const highNote = await waitForElement<SVGGElement>(host, '[aria-label="Select high note A4"]');

        await page.elementLocator(highNote).click();

        const octaveDown = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave down"]');

        await page.elementLocator(octaveDown).click();

        expect(onChange).toHaveBeenCalledWith('high', parsePitch('A3'));
    });

    it('edits a missing endpoint without crashing on a partial range', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={null}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note not set"]');

        await page.elementLocator(lowHeader).click();

        const octaveDown = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave down"]');

        await page.elementLocator(octaveDown).click();

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('C3'));
    });

    it('raises the low note an octave via the octave-up control', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'low', 'C3');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        await page.elementLocator(button).click();

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('C4'));
    });

    it('lowers the high note an octave via the octave-down control', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'high', 'A4');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave down"]');

        await page.elementLocator(button).click();

        expect(onChange).toHaveBeenCalledWith('high', parsePitch('A3'));
    });

    it('recomputes the clef after a controlled range change', async () => {
        const ControlledStaff = () => {
            const [low, setLow] = useState(parsePitch('C4'));
            const [high, setHigh] = useState(parsePitch('A4'));

            return (
                <VocalRangeStaff
                    interactive
                    low={low}
                    high={high}
                    onChange={(which, pitch) => {
                        if (which === 'low') {
                            setLow(pitch);
                        } else {
                            setHigh(pitch);
                        }
                    }}
                />
            );
        };
        const host = await render(<ControlledStaff />);

        expect(host.querySelector('[data-clef="treble-8vb"]')).not.toBeNull();

        await selectRangeHeader(host, 'high', 'A4');

        const octaveUp = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        await page.elementLocator(octaveUp).click();
        await waitForElement(host, '[data-clef="treble"]');

        expect(host.querySelector('[aria-label="Edit high note A5"]')).not.toBeNull();
    });

    it('toggles a sharp onto the low note', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'low', 'C3');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Sharp"]');

        await page.elementLocator(button).click();

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('C#3'));
    });

    it('toggles an active sharp back to natural', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C#3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'low', 'C#3');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Sharp"]');

        await page.elementLocator(button).click();

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('C3'));
    });

    it('presents flat and sharp as exclusive toggles whose active value can be cleared', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C#3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'low', 'C#3');

        const flat = await waitForElement<HTMLButtonElement>(host, '[aria-label="Flat"]');
        const sharp = await waitForElement<HTMLButtonElement>(host, '[aria-label="Sharp"]');

        expect(flat.getAttribute('aria-pressed')).toBe('false');
        expect(sharp.getAttribute('aria-pressed')).toBe('true');

        await page.elementLocator(sharp).click();

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('C3'));
    });

    it('does not raise the high note past the C6 bound', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('C6')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'high', 'C6');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave up"]');

        expect(button.disabled).toBe(true);
        button.click();

        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not lower the low note past the C2 bound', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C2')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        await selectRangeHeader(host, 'low', 'C2');

        const button = await waitForElement<HTMLButtonElement>(host, '[aria-label="Octave down"]');

        expect(button.disabled).toBe(true);
        button.click();

        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not reposition a note when the empty staff is clicked', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );

        const staff = await waitForElement<SVGSVGElement>(host, 'svg');

        await page.elementLocator(staff).click({position: {x: 150, y: 50}});

        expect(onChange).not.toHaveBeenCalled();
    });

    it('previews a direct drag and persists exactly once on pointer release', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const {
            capture, clientY, pointerId, release,
        } = await dragNoteToPosition(host, note, 0);

        expect(host.querySelector('[aria-label="Select low note E3"]')).not.toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        expect(capture).toHaveBeenCalledWith(pointerId);

        note.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId, button: 0, clientY,
        }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('low', parsePitch('E3'));
        expect(release).toHaveBeenCalledWith(pointerId);
    });

    it('keeps the selected accidental while dragging between staff positions', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C#3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C#3"]');
        const {clientY, pointerId} = await dragNoteToPosition(host, note, 0);

        expect(host.querySelector('[aria-label="Select low note E#3"]')).not.toBeNull();

        note.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId, button: 0, clientY,
        }));

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('E#3'));
    });

    it.each([
        {
            which: 'low' as const, source: 'C3', position: -4, target: 'A2',
        }, {
            which: 'high' as const, source: 'A4', position: 12, target: 'C5',
        },
    ])('supports two dynamic ledger lines at the $which boundary', async ({
        which, source, position, target,
    }) => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, `[aria-label="Select ${which} note ${source}"]`);
        const {clientY, pointerId} = await dragNoteToPosition(host, note, position);
        const preview = await waitForElement<SVGGElement>(host, `[aria-label="Select ${which} note ${target}"]`);

        expect(preview.querySelectorAll('[data-ledger-line]')).toHaveLength(2);

        note.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId, button: 0, clientY,
        }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(which, parsePitch(target));
    });

    it('clamps a drag beyond the staff to two ledger lines', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const {pointerId} = await dragNoteToPosition(host, note, -100);

        expect(host.querySelector('[aria-label="Select low note A2"]')).not.toBeNull();

        note.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId, button: 0, clientY: 1000,
        }));

        expect(onChange).toHaveBeenCalledWith('low', parsePitch('A2'));
    });

    it('discards the preview and does not persist when dragging is cancelled', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const {pointerId} = await dragNoteToPosition(host, note, 0);

        note.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId}));

        await waitForElement(host, '[aria-label="Select low note C3"]');

        expect(host.querySelector('[data-dragging]')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('discards the preview when pointer capture is unexpectedly lost', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const {pointerId} = await dragNoteToPosition(host, note, 0);

        note.dispatchEvent(new PointerEvent('lostpointercapture', {bubbles: true, pointerId}));

        await waitForElement(host, '[aria-label="Select low note C3"]');

        expect(host.querySelector('[data-dragging]')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });
});
