import {parsePitch} from '@stagistic/script';
import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

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

describe('VocalRangeStaff', () => {
    it('renders five staff lines and two noteheads for a set range', async () => {
        const host = await render(
            <VocalRangeStaff low={parsePitch('C3')} high={parsePitch('A4')} />,
        );

        expect(host.querySelectorAll('[data-staff-line]').length).toBe(5);
        expect(host.querySelectorAll('[data-notehead]').length).toBe(2);
    });

    it('renders an accidental for a sharp note', async () => {
        const host = await render(
            <VocalRangeStaff low={parsePitch('F#3')} high={parsePitch('A4')} />,
        );

        expect(host.querySelectorAll('[data-accidental]').length).toBe(1);
    });

    it('renders no accidental when neither note has one', async () => {
        const host = await render(
            <VocalRangeStaff low={parsePitch('C3')} high={parsePitch('A4')} />,
        );

        expect(host.querySelectorAll('[data-accidental]').length).toBe(0);
    });

    it('still renders an empty staff with a default clef when notes are unset', async () => {
        const host = await render(<VocalRangeStaff low={null} high={null} />);

        expect(host.querySelectorAll('[data-staff-line]').length).toBe(5);
        expect(host.querySelectorAll('[data-notehead]').length).toBe(0);
        expect(host.querySelectorAll('[data-clef]').length).toBe(1);
    });

    it('renders a filled clef inside the staff instead of beside it', async () => {
        const host = await render(<VocalRangeStaff low={null} high={null} />);
        const clefPath = await waitForElement<SVGPathElement>(host, '[data-clef] path');
        const staffLine = await waitForElement<SVGLineElement>(host, '[data-staff-line]');
        const clefRect = clefPath.getBoundingClientRect();
        const lineRect = staffLine.getBoundingClientRect();
        const style = getComputedStyle(clefPath);

        expect(style.fill).not.toBe('none');
        expect(style.stroke).toBe('none');
        expect(lineRect.left).toBeLessThan(clefRect.left + clefRect.width / 2);
        expect(lineRect.right).toBeGreaterThan(clefRect.right);
    });

    it('picks treble for a high range and treble-8vb for a low range', async () => {
        const soprano = await render(
            <VocalRangeStaff low={parsePitch('C4')} high={parsePitch('C6')} />,
        );

        expect(soprano.querySelector('[data-clef]')?.getAttribute('data-clef')).toBe('treble');

        const baritone = await render(
            <VocalRangeStaff low={parsePitch('C3')} high={parsePitch('G4')} />,
        );

        expect(baritone.querySelector('[data-clef]')?.getAttribute('data-clef')).toBe('treble-8vb');
    });

    it('picks treble-8vb while only a low note is set', async () => {
        const partialRange = await render(
            <VocalRangeStaff low={parsePitch('G3')} high={null} />,
        );

        expect(partialRange.querySelector('[data-clef]')?.getAttribute('data-clef')).toBe('treble-8vb');
    });
});
