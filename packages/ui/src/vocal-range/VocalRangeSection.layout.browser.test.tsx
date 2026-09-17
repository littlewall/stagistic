import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {AttributeManagerCharactersPanel} from '../dialogs/AttributeManagerCharactersPanel';

const mountedRoots: Root[] = [];

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

describe('VocalRangeSection layout', () => {
    it('matches the name input and renders a compact, separated staff', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        host.style.width = '900px';
        host.style.height = '600px';
        host.style.setProperty('--space-md', '8px');
        document.body.appendChild(host);
        mountedRoots.push(root);
        root.render(
            <AttributeManagerCharactersPanel
                characters={[
                    {
                        id: 'char-1',
                        name: 'ANNA',
                        color: null,
                        outline: null,
                        voiceType: 'soprano',
                        vocalRangeLow: 'C3',
                        vocalRangeHigh: 'A4',
                    },
                ]}
                groups={[]}
                initialSelectedCharacterId="char-1"
            />,
        );

        const name = await waitForElement<HTMLInputElement>('#character-name-char-1');
        const voiceType = await waitForElement<HTMLInputElement>('[aria-label="Voice type"]');
        const staff = await waitForElement<SVGSVGElement>('[aria-label="Vocal range staff"]');
        const widget = staff.parentElement!;
        const fields = widget.parentElement!;
        const hitTarget = staff.querySelector<SVGEllipseElement>('[data-note-hit-target]')!;
        const staffLine = staff.querySelector<SVGLineElement>('[data-staff-line]')!;
        const noteheads = [...staff.querySelectorAll<SVGEllipseElement>('[data-notehead]')];
        const nameRect = name.getBoundingClientRect();
        const voiceTypeRect = voiceType.getBoundingClientRect();
        const widgetRect = widget.getBoundingClientRect();
        const staffRect = staff.getBoundingClientRect();
        const staffLineRect = staffLine.getBoundingClientRect();
        const hitTargetRect = hitTarget.getBoundingClientRect();
        const previousStaffScale = (voiceTypeRect.width * 0.7) / 316;
        const previousStaffHeight = (voiceTypeRect.width * 0.6 * 116) / 316;
        const [lowNoteRect, highNoteRect] = noteheads.map(note => note.getBoundingClientRect());
        const noteGap = highNoteRect.x + highNoteRect.width / 2
            - (lowNoteRect.x + lowNoteRect.width / 2);

        expect(voiceTypeRect.width).toBe(nameRect.width);
        expect(voiceTypeRect.height).toBe(nameRect.height);
        expect(widgetRect.width).toBe(voiceTypeRect.width);
        expect(staffRect.height).toBeCloseTo(previousStaffHeight, 0);
        expect(staffLineRect.left - staffRect.left).toBeGreaterThanOrEqual(24);
        expect(staffRect.right - staffLineRect.right).toBeGreaterThanOrEqual(24);
        expect(noteGap).toBeGreaterThan(180);
        expect(getComputedStyle(fields).gap).toBe('8px');
        expect(hitTargetRect.width).toBeCloseTo(13.2 * 2 * previousStaffScale, 0);
        expect(hitTargetRect.height).toBeCloseTo(10.5 * 2 * previousStaffScale, 0);
        expect(document.querySelector('[data-clear-range]')).toBeNull();
    });
});
