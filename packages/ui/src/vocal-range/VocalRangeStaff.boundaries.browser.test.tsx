import '../../styles/tokens.css';

import {parsePitch} from '@stagistic/script';
import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

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

const dragNoteToPosition = async (
    host: HTMLElement,
    note: SVGGElement,
    position: number,
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
        bottom: 116,
        left: 0,
        width: 316,
        height: 116,
        toJSON: () => ({}),
    });
    vi.spyOn(note, 'setPointerCapture').mockImplementation(() => undefined);
    vi.spyOn(note, 'releasePointerCapture').mockImplementation(() => undefined);

    note.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, pointerId: 1, button: 0, clientY: sourceClientY,
    }));
    note.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerId: 1, buttons: 1, clientY,
    }));
    note.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId: 1, button: 0, clientY,
    }));
};

describe('VocalRangeStaff range boundaries', () => {
    it('selects a note without changing its pitch when the pointer does not move', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const svg = await waitForElement<SVGSVGElement>(host, 'svg');
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');

        vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
            x: 0,
            y: 0,
            top: 0,
            right: 316,
            bottom: 116,
            left: 0,
            width: 316,
            height: 116,
            toJSON: () => ({}),
        });
        vi.spyOn(note, 'setPointerCapture').mockImplementation(() => undefined);
        vi.spyOn(note, 'releasePointerCapture').mockImplementation(() => undefined);

        note.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, pointerId: 1, button: 0, clientY: 84,
        }));
        note.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId: 1, button: 0, clientY: 84,
        }));

        await waitForElement(host, '[data-selected]');

        expect(note.getAttribute('data-selected')).not.toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('stops the low-note drag at the high note', async () => {
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

        await dragNoteToPosition(host, note, 12);

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith('low', parsePitch('A4'));
    });

    it('stops the high-note drag at the low note', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select high note A4"]');

        await dragNoteToPosition(host, note, -4);

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith('high', parsePitch('C3'));
    });

    it('clamps a sharp high note inward at the absolute upper boundary', async () => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C4')}
                high={parsePitch('A#5')}
                onChange={onChange}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select high note A#5"]');

        await dragNoteToPosition(host, note, 12);

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith('high', parsePitch('B#5'));
    });

    it.each([
        {
            selected: 'low', action: 'Octave up', low: 'C4', high: 'A4',
        }, {
            selected: 'high', action: 'Octave down', low: 'C4', high: 'A4',
        },
    ])('disables $action when it would move $selected across the other endpoint', async ({
        selected, action, low, high,
    }) => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch(low)}
                high={parsePitch(high)}
                onChange={onChange}
            />,
        );
        const header = await waitForElement<HTMLButtonElement>(
            host,
            `[aria-label="Edit ${selected} note ${selected === 'low' ? low : high}"]`,
        );

        await page.elementLocator(header).click();

        const button = await waitForElement<HTMLButtonElement>(host, `[aria-label="${action}"]`);

        expect(button.disabled).toBe(true);
        button.click();
        expect(onChange).not.toHaveBeenCalled();
    });

    it.each([{selected: 'low', action: 'Sharp'}, {selected: 'high', action: 'Flat'}])('disables $action when it would invert an equal range from the $selected endpoint', async ({
        selected, action,
    }) => {
        const onChange = vi.fn();
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C4')}
                high={parsePitch('C4')}
                onChange={onChange}
            />,
        );
        const header = await waitForElement<HTMLButtonElement>(host, `[aria-label="Edit ${selected} note C4"]`);

        await page.elementLocator(header).click();

        const button = await waitForElement<HTMLButtonElement>(host, `[aria-label="${action}"]`);

        expect(button.disabled).toBe(true);
        button.click();
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('VocalRangeStaff note and ledger visibility', () => {
    it('does not add a notehead or halo visual for pointer hover', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const notehead = note.querySelector<SVGEllipseElement>('[data-notehead]')!;
        const halo = note.querySelector<SVGEllipseElement>('[data-selection-halo]')!;
        const restingFill = getComputedStyle(notehead).fill;

        await userEvent.hover(note);

        expect(getComputedStyle(notehead).fill).toBe(restingFill);
        expect(getComputedStyle(halo).opacity).toBe('0');
    });

    it('fills the whole range header on hover without overriding its active state', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );

        host.style.setProperty('--duration-normal', '0ms');

        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');
        const highHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit high note A4"]');

        await userEvent.hover(highHeader);

        expect(getComputedStyle(highHeader).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(highHeader).borderRadius).toBe('0px');

        await userEvent.unhover(highHeader);
        await userEvent.click(lowHeader);
        await waitForElement(host, '[aria-label="Edit low note C3"][aria-pressed="true"]');

        const activeBackground = getComputedStyle(lowHeader).backgroundColor;

        await userEvent.hover(lowHeader);

        expect(getComputedStyle(lowHeader).backgroundColor).toBe(activeBackground);
    });

    it('switches the active range header without animating through the hover background', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const lowHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');
        const highHeader = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit high note A4"]');

        await userEvent.click(lowHeader);
        await userEvent.hover(highHeader);
        await userEvent.click(highHeader);

        const animatedBackgroundProperties = [
            'all',
            'background',
            'background-color',
        ];
        const backgroundTransitions = highHeader.getAnimations().filter(animation => animation instanceof CSSTransition
            && animatedBackgroundProperties.includes(animation.transitionProperty));
        const transitionedProperties = getComputedStyle(highHeader).transitionProperty
            .split(',')
            .map(property => property.trim());

        expect(backgroundTransitions).toHaveLength(0);
        expect(transitionedProperties).not.toContain('all');
        expect(transitionedProperties).not.toContain('background');
        expect(transitionedProperties).not.toContain('background-color');
    });

    it('does not show a persistent note halo only because the note was selected', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const header = await waitForElement<HTMLButtonElement>(host, '[aria-label="Edit low note C3"]');
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const halo = note.querySelector<SVGEllipseElement>('[data-selection-halo]')!;

        await page.elementLocator(header).click();

        expect(note.getAttribute('data-selected')).not.toBeNull();
        expect(getComputedStyle(halo).opacity).toBe('0');
    });

    it('renders a prominent notehead that slightly overlaps adjacent staff spaces', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const notehead = note.querySelector<SVGEllipseElement>('[data-notehead]')!;
        const hitTarget = note.querySelector<SVGEllipseElement>('ellipse:first-child')!;
        const staffLines = [...host.querySelectorAll<SVGLineElement>('[data-staff-line]')];
        const lineSpacing = Math.abs(
            Number(staffLines[1].getAttribute('y1'))
                - Number(staffLines[0].getAttribute('y1')),
        );
        const noteWidth = Number(notehead.getAttribute('rx')) * 2;
        const noteHeight = Number(notehead.getAttribute('ry')) * 2;

        expect(noteWidth).toBeGreaterThanOrEqual(lineSpacing * 1.5);
        expect(noteHeight).toBeCloseTo(lineSpacing * 1.2);
        expect(Number(getComputedStyle(notehead).strokeWidth.replace('px', ''))).toBeGreaterThanOrEqual(2);
        expect(Number(hitTarget.getAttribute('rx'))).toBeGreaterThanOrEqual(12);
        expect(Number(hitTarget.getAttribute('ry'))).toBeGreaterThanOrEqual(10);
    });

    it('draws a solid connector with clearance from the notes and high accidental', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('Ab4')}
            />,
        );
        const connector = await waitForElement<SVGLineElement>(host, 'svg > line:not([data-staff-line])');
        const lowNotehead = await waitForElement<SVGEllipseElement>(host, '[aria-label="Select low note C3"] [data-notehead]');
        const highAccidental = await waitForElement<SVGGElement>(host, '[aria-label="Select high note Ab4"] [data-accidental]');
        const lowRight = Number(lowNotehead.getAttribute('cx')) + Number(lowNotehead.getAttribute('rx'));
        const connectorRect = connector.getBoundingClientRect();
        const accidentalRect = highAccidental.getBoundingClientRect();

        expect(getComputedStyle(connector).strokeDasharray).toBe('none');
        expect(Number(connector.getAttribute('x1')) - lowRight).toBeGreaterThanOrEqual(12);
        expect(accidentalRect.left - connectorRect.right).toBeGreaterThanOrEqual(8);
    });

    it('draws ledger lines across and beyond the notehead so its position stays clear', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const note = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const notehead = note.querySelector<SVGEllipseElement>('[data-notehead]')!;
        const ledger = note.querySelector<SVGLineElement>('[data-ledger-line]')!;
        const ledgerWidth = Number(ledger.getAttribute('x2')) - Number(ledger.getAttribute('x1'));
        const noteWidth = Number(notehead.getAttribute('rx')) * 2;

        expect(notehead.compareDocumentPosition(ledger) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        expect(ledgerWidth).toBeGreaterThanOrEqual(noteWidth + 10);
    });

    it('renders flat at least as tall as sharp for balanced visual weight', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('F#3')}
                high={parsePitch('Ab4')}
            />,
        );
        const sharp = await waitForElement<SVGGElement>(host, '[aria-label="Select low note F#3"] [data-accidental]');
        const flat = await waitForElement<SVGGElement>(host, '[aria-label="Select high note Ab4"] [data-accidental]');

        expect(flat.getBoundingClientRect().height).toBeGreaterThanOrEqual(sharp.getBoundingClientRect().height);
    });
});
