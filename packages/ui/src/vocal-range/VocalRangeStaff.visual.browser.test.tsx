import '../../styles/tokens.css';

import {parsePitch} from '@stagistic/script';
import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

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

describe('VocalRangeStaff visual states', () => {
    it('colors the selected note stroke without filling its background or adding hover color', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );
        const low = await waitForElement<SVGGElement>(host, '[aria-label="Select low note C3"]');
        const high = await waitForElement<SVGGElement>(host, '[aria-label="Select high note A4"]');
        const lowHead = low.querySelector<SVGEllipseElement>('[data-notehead]')!;
        const highHead = high.querySelector<SVGEllipseElement>('[data-notehead]')!;
        const restingFill = getComputedStyle(lowHead).fill;
        const restingStroke = getComputedStyle(lowHead).stroke;

        await userEvent.hover(low);

        expect(getComputedStyle(lowHead).fill).toBe(restingFill);

        await userEvent.click(low);
        lowHead.getAnimations().forEach(animation => animation.finish());

        const selectedStyle = getComputedStyle(lowHead);

        expect(low.hasAttribute('data-selected')).toBe(true);
        expect(selectedStyle.fill).toBe(restingFill);
        expect(selectedStyle.stroke).not.toBe(restingStroke);

        await userEvent.hover(high);

        expect(getComputedStyle(highHead).fill).toBe(restingFill);
        expect(getComputedStyle(highHead).stroke).toBe(restingStroke);
        expect(getComputedStyle(lowHead).stroke).toBe(selectedStyle.stroke);
    });

    it('sizes the flat prominently and aligns its bowl with the note position', async () => {
        const host = await render(
            <VocalRangeStaff
                interactive
                low={parsePitch('F#3')}
                high={parsePitch('Ab4')}
            />,
        );
        const sharp = await waitForElement<SVGGElement>(host, '[aria-label="Select low note F#3"] [data-accidental]');
        const flat = await waitForElement<SVGGElement>(host, '[aria-label="Select high note Ab4"] [data-accidental]');
        const flatNote = await waitForElement<SVGEllipseElement>(host, '[aria-label="Select high note Ab4"] [data-notehead]');
        const flatMatrix = flat.transform.baseVal.consolidate()!.matrix;
        const flatBowlCenterY = flatMatrix.f + 13 * flatMatrix.d;
        const flatRect = flat.getBoundingClientRect();
        const sharpRect = sharp.getBoundingClientRect();

        expect(flatRect.height).toBeGreaterThanOrEqual(sharpRect.height * 1.25);
        expect(flatRect.width).toBeGreaterThanOrEqual(sharpRect.width);
        expect(flatBowlCenterY).toBeCloseTo(Number(flatNote.getAttribute('cy')), 5);
    });

    it('keeps the main treble clef at one scale and only adds the octave mark below', async () => {
        const trebleHost = await render(
            <VocalRangeStaff low={parsePitch('C4')} high={parsePitch('C6')} />,
        );
        const octaveHost = await render(
            <VocalRangeStaff low={parsePitch('C3')} high={parsePitch('G4')} />,
        );
        const treble = await waitForElement<SVGGElement>(trebleHost, '[data-clef="treble"]');
        const octaveTreble = await waitForElement<SVGGElement>(octaveHost, '[data-clef="treble-8vb"]');
        const trebleScale = treble.transform.baseVal.consolidate()!.matrix.a;
        const octaveTrebleScale = octaveTreble.transform.baseVal.consolidate()!.matrix.a;

        expect(octaveTrebleScale).toBeCloseTo(trebleScale, 8);
        expect(octaveTreble.getBoundingClientRect().height).toBeGreaterThan(
            treble.getBoundingClientRect().height,
        );
    });
});
