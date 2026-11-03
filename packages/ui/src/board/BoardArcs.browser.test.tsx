import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';
import {
    BoardArcs,
    type BoardArcsAct,
    type BoardArcsArc,
} from './BoardArcs';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) return value;

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const ACTS: BoardArcsAct[] = [
    {
        key: '__default-act__',
        name: 'ACT 1',
        scenes: [
            {
                headingBlockId: 's0',
                number: '1.',
                title: 'Prologue',
            },
        ],
    },
    {
        key: 'a1',
        name: 'ACT ONE',
        scenes: [
            {
                headingBlockId: 's1',
                number: '2.',
                title: 'Kitchen',
            },
            {
                headingBlockId: 's2',
                number: '3.',
                title: 'Garden',
            },
        ],
    },
];

const ARCS: BoardArcsArc[] = [
    {
        id: 'c-anna',
        name: 'ANNA',
        color: '#cc3344',
        points: [
            {
                headingBlockId: 's1',
                sceneIndex: 1,
                value: 40,
                evidence: true,
                onCard: true,
                note: 'Waits for the letter',
            },
            {
                headingBlockId: 's2',
                sceneIndex: 2,
                value: -20,
                evidence: false,
                onCard: true,
                note: null,
            },
        ],
    },
    {
        id: 'c-cy',
        name: 'CY',
        color: '#ff6644',
        points: [
            {
                headingBlockId: 's0',
                sceneIndex: 0,
                value: 10,
                evidence: true,
                onCard: true,
                note: null,
            },
        ],
    },
    {
        id: 'c-ben',
        name: 'BEN',
        color: '#2266cc',
        points: [
            {
                headingBlockId: 's0',
                sceneIndex: 0,
                value: 10,
                evidence: true,
                onCard: true,
                note: null,
            },
            {
                headingBlockId: 's1',
                sceneIndex: 1,
                value: 5,
                evidence: false,
                onCard: true,
                note: null,
            },
        ],
    },
];

const tree = (acts: BoardArcsAct[], arcs: BoardArcsArc[]) => (
    <>
        <FocusVisibilityManager />
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
            }}
        >
            <BoardArcs acts={acts} arcs={arcs} />
        </div>
    </>
);

const renderArcs = (acts: BoardArcsAct[] = ACTS, arcs: BoardArcsArc[] = ARCS, hostWidth?: number) => {
    const host = document.createElement('div');

    if (hostWidth !== undefined) host.style.width = `${hostWidth}px`;

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(tree(acts, arcs));
};

/* Same host, new arcs: the way a changed filter reaches the chart. */
const rerenderArcs = (arcs: BoardArcsArc[]) => root?.render(tree(ACTS, arcs));

const rerenderWide = (scenes: BoardArcsAct['scenes']) => root?.render(tree([
    {
        key: '__default-act__',
        name: 'ACT 1',
        scenes,
    },
], ARCS));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const button = (label: string) => [...document.querySelectorAll<HTMLElement>('button')].find(
    element => element.textContent?.trim() === label || element.getAttribute('aria-label') === label,
);

const arcPath = (id: string) => document.querySelector<SVGPathElement>(`[data-arc-path="${id}"]`);

const point = (id: string, sceneIndex: number) => document.querySelector<SVGCircleElement>(`[data-point="${id}:${sceneIndex}"]`);

const strokeWidth = (element: SVGPathElement) => getComputedStyle(element).strokeWidth;

const opacity = (element: SVGPathElement | SVGCircleElement) => getComputedStyle(element).opacity;

const actName = (name: string) => document.querySelector<HTMLElement>(`[data-act="${name}"]`);

const rgb = (hex: string) => {
    const value = hex.slice(1);

    return `rgb(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)})`;
};

describe('BoardArcs', () => {
    it('draws noninteractive presence dots on the curve only without a user point', async () => {
        renderArcs(ACTS, [{...ARCS[0], presence: [0, 1]}]);

        const dot = await waitFor(() => document.querySelector('[data-presence="c-anna:0"]'));

        expect(dot.getAttribute('aria-hidden')).toBe('true');
        expect(dot.getAttribute('pointer-events')).toBe('none');
        expect(document.querySelector('[data-presence="c-anna:1"]')).toBeNull();
        expect(dot.getAttribute('cy')).toBe('200');
    });

    it('opens in the overview with one legend button per character and equal arcs', async () => {
        renderArcs();

        await waitFor(() => button('ANNA'));
        await waitFor(() => arcPath('c-anna'));

        expect([...document.querySelectorAll<HTMLElement>('button[data-arc-id]')].map(item => item.textContent?.trim())).toEqual([
            'ANNA',
            'CY',
            'BEN',
        ]);
        expect([...document.querySelectorAll<HTMLElement>('button[data-arc-id]')].every(item => item.getAttribute('aria-checked') === 'true')).toBe(true);

        expect(strokeWidth(requireValue(arcPath('c-anna'), 'anna path'))).toBe('2px');
        expect(strokeWidth(requireValue(arcPath('c-ben'), 'ben path'))).toBe('2px');
        expect(opacity(requireValue(arcPath('c-anna'), 'anna path'))).toBe('1');
    });

    it('toggles multiple characters independently and keeps unchecked items available', async () => {
        renderArcs();

        const anna = await waitFor(() => button('ANNA'));
        const ben = requireValue(button('BEN'), 'ben checkbox');

        expect(anna.getAttribute('role')).toBe('checkbox');
        await userEvent.click(anna);
        expect(arcPath('c-anna')).toBeNull();
        expect(anna.getAttribute('aria-checked')).toBe('false');
        expect(ben.getAttribute('aria-checked')).toBe('true');
        expect(arcPath('c-ben')).not.toBeNull();
        await userEvent.click(ben);
        expect(arcPath('c-ben')).toBeNull();
        await userEvent.click(anna);
        expect(arcPath('c-anna')).not.toBeNull();
        expect(arcPath('c-ben')).toBeNull();
        expect(getComputedStyle(requireValue(anna.querySelector('span[aria-hidden]'))).backgroundColor).toBe(rgb('#cc3344'));
        expect(getComputedStyle(requireValue(ben.querySelector('span[aria-hidden]'))).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('allows all characters to be off and restored with the keyboard', async () => {
        renderArcs();
        await userEvent.click(await waitFor(() => button('ANNA')));
        await userEvent.click(requireValue(button('BEN')));
        await userEvent.click(requireValue(button('CY')));
        expect(document.querySelectorAll('[data-arc-path]')).toHaveLength(0);
        expect(document.querySelectorAll('[role="checkbox"]')).toHaveLength(3);
        requireValue(button('ANNA')).focus();
        await userEvent.keyboard(' ');
        expect(arcPath('c-anna')).not.toBeNull();
        expect(arcPath('c-ben')).toBeNull();
    });

    it('activates a character by clicking its arc or a point', async () => {
        renderArcs();

        const path = await waitFor(() => arcPath('c-ben'));
        const spot = path.getPointAtLength(path.getTotalLength() / 4);

        await userEvent.click(requireValue(path.ownerSVGElement, 'chart'), {position: {x: spot.x, y: spot.y}});
        expect(arcPath('c-ben')?.getAttribute('aria-pressed')).toBe('true');
        expect(strokeWidth(requireValue(arcPath('c-ben'), 'ben path'))).toBe('2px');

        await userEvent.click(requireValue(point('c-anna', 2), 'anna hollow point'));
        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('true');
        expect(arcPath('c-ben')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('returns to the overview on Escape after clicking an arc or a point', async () => {
        renderArcs();

        const path = await waitFor(() => arcPath('c-ben'));
        const spot = path.getPointAtLength(path.getTotalLength() / 4);

        await userEvent.click(requireValue(path.ownerSVGElement, 'chart'), {position: {x: spot.x, y: spot.y}});
        expect(arcPath('c-ben')?.getAttribute('aria-pressed')).toBe('true');

        await userEvent.keyboard('{Escape}');
        expect(arcPath('c-ben')?.getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(requireValue(point('c-anna', 2), 'anna point'));
        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('true');

        await userEvent.keyboard('{Escape}');
        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('returns to the overview when the filter hides the active character', async () => {
        renderArcs();

        const path = await waitFor(() => arcPath('c-anna'));

        path.focus();
        await userEvent.keyboard('{Enter}');
        expect(path.getAttribute('aria-pressed')).toBe('true');
        expect(opacity(requireValue(arcPath('c-ben')))).toBe('1');
        expect(strokeWidth(requireValue(arcPath('c-ben')))).toBe('2px');

        rerenderArcs(ARCS.filter(arc => arc.id !== 'c-anna'));
        await waitFor(() => !button('ANNA'));

        expect([...document.querySelectorAll('button[data-arc-id]')].every(item => item.getAttribute('aria-checked') === 'true')).toBe(true);
        expect(strokeWidth(requireValue(arcPath('c-ben'), 'ben path'))).toBe('2px');
        expect(opacity(requireValue(arcPath('c-ben'), 'ben path'))).toBe('1');

        /* The character does not come back active when the filter shows it again. */
        rerenderArcs(ARCS);
        await waitFor(() => button('ANNA'));
        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('draws a filled point for script evidence and an outlined diamond without it', async () => {
        renderArcs();

        const filled = await waitFor(() => point('c-anna', 1));
        const hollow = requireValue(point('c-anna', 2), 'hollow point');

        expect(getComputedStyle(filled).fill).toBe(rgb('#cc3344'));
        expect(getComputedStyle(filled).strokeWidth).toBe('0px');

        expect(getComputedStyle(hollow).fill).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(hollow).stroke).toBe(rgb('#cc3344'));
        expect(filled.tagName).toBe('circle');
        expect(hollow.tagName).toBe('rect');
        expect(hollow.getAttribute('transform')).toContain('rotate(45');
    });

    it('names points for screen readers with the spoken value, never a number', async () => {
        renderArcs();

        await waitFor(() => point('c-anna', 1));

        expect(requireValue(point('c-anna', 1), 'anna better point').getAttribute('aria-label')).toBe('ANNA, Scene 2. Kitchen, clearly better');
        expect(requireValue(point('c-anna', 2), 'anna worse point').getAttribute('aria-label')).toBe('ANNA, Scene 3. Garden, slightly worse');
        expect(requireValue(point('c-cy', 0), 'cy point').getAttribute('aria-label')).toBe('CY, Scene 1. Prologue, slightly better');
    });

    it('shows a point tooltip with character, scene and note, never the value', async () => {
        renderArcs();

        const filled = await waitFor(() => point('c-anna', 1));

        await userEvent.hover(filled);

        const tooltip = await waitFor(() => document.querySelector<HTMLElement>('[role="tooltip"]'));

        expect(tooltip.textContent).toContain('ANNA');
        expect(tooltip.textContent).toContain('Scene: 2. Kitchen');
        expect(tooltip.textContent).toContain('Waits for the letter');
        expect(tooltip.textContent).not.toContain('40');
        expect(tooltip.querySelector('strong')?.textContent).toBe('ANNA');

        const dot = requireValue(tooltip.querySelector('[aria-hidden="true"]'), 'character color');
        const note = requireValue(tooltip.querySelector('p'), 'separate event sentence');

        expect(getComputedStyle(dot).backgroundColor).toBe(rgb('#cc3344'));
        expect(note.textContent).toBe('Waits for the letter');
        expect(getComputedStyle(note).borderTopStyle).toBe('solid');

        await userEvent.unhover(filled);
        await userEvent.hover(requireValue(point('c-ben', 0), 'point without note'));

        const withoutNote = await waitFor(() => document.querySelector<HTMLElement>('[role="tooltip"]'));

        expect(withoutNote.querySelector('strong')?.textContent).toBe('BEN');
        expect(withoutNote.querySelector('p')).toBeNull();
    });

    it('lines the act band up with the chart: proportional shares, dividers on the chart dividers', async () => {
        renderArcs();

        const second = await waitFor(() => actName('ACT ONE'));
        const first = requireValue(actName('ACT 1'), 'first act');
        const plot = (await waitFor(() => document.querySelector('svg'))).getBoundingClientRect();
        const divider = requireValue(document.querySelector<HTMLElement>('[data-act-divider]'), 'chart divider');

        /* One scene against two: a third of the width, no padding or border skewing the shares. */
        expect(first.getBoundingClientRect().width).toBeCloseTo(plot.width / 3, 0);
        expect(second.getBoundingClientRect().left).toBeCloseTo(divider.getBoundingClientRect().left, 0);
        expect(divider.getBoundingClientRect().top).toBeLessThanOrEqual(first.getBoundingClientRect().top);
        expect(divider.getBoundingClientRect().bottom).toBeCloseTo(plot.bottom, 0);
        expect(getComputedStyle(second).paddingLeft).toBe('0px');
        expect(getComputedStyle(second).borderLeftWidth).toBe('0px');
    });

    it('says quietly when scenes exist but no characters do', async () => {
        renderArcs(ACTS, []);

        await waitFor(() => document.body.textContent?.includes('No characters yet.'));

        expect(document.querySelector('svg')).toBeNull();
    });

    it('draws the chart and legend without a hint when there are no points', async () => {
        const pointless = ARCS.map(arc => ({...arc, points: []}));

        renderArcs(ACTS, pointless);

        await waitFor(() => button('ANNA'));
        await waitFor(() => document.querySelector('svg'));

        expect(document.querySelector('svg')).not.toBeNull();
        expect(document.body.textContent).not.toContain('No characters yet.');
        expect(document.querySelectorAll('[data-arc-path]')).toHaveLength(ARCS.length);
    });

    it('wraps a long act name instead of clipping it', async () => {
        const acts: BoardArcsAct[] = [
            {
                key: '__default-act__',
                name: 'ACT ONE: THE LONGEST NIGHT',
                scenes: [
                    {
                        headingBlockId: 's0',
                        number: '1.',
                        title: 'Prologue',
                    },
                ],
            },
        ];

        renderArcs(acts, ARCS, 160);

        const label = await waitFor(() => actName('ACT ONE: THE LONGEST NIGHT'));
        const span = requireValue(label.querySelector<HTMLElement>('span'), 'act name span');
        const lineHeightRaw = getComputedStyle(span).lineHeight;
        const lineHeight = lineHeightRaw === 'normal' ? parseFloat(getComputedStyle(span).fontSize) * 1.2 : parseFloat(lineHeightRaw);

        expect(label.textContent).toBe('ACT ONE: THE LONGEST NIGHT');
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        expect(label.clientHeight).toBeGreaterThanOrEqual(lineHeight * 2 - 1);
    });

    it('thins scene numbers when they get dense', async () => {
        const manyScenes = Array.from({length: 12}, (_, index) => ({
            headingBlockId: `s${index}`,
            number: `${index + 1}.`,
            title: `Scene ${index + 1}`,
        }));

        renderArcs([
            {
                key: '__default-act__',
                name: 'ACT 1',
                scenes: manyScenes,
            },
        ], ARCS, 200);

        await waitFor(() => document.querySelector('svg'));

        expect(document.querySelectorAll<HTMLElement>('[data-scene-number]').length).toBeLessThan(12);
    });

    it('centres each scene number on its scene', async () => {
        renderArcs(ACTS, ARCS, 400);

        await waitFor(() => document.querySelector('svg'));

        const plot = requireValue(document.querySelector('svg'), 'chart').getBoundingClientRect();
        const labels = [...document.querySelectorAll<HTMLElement>('[data-scene-number]')];

        expect(labels).toHaveLength(3);
        labels.forEach((label, index) => {
            const rect = label.getBoundingClientRect();

            expect(rect.left + rect.width / 2).toBeCloseTo(plot.left + (plot.width / 3) * (index + 0.5), 0);
        });
    });

    it('thins by the widest formatted label: long numbers thin out sooner than short ones', async () => {
        const scenesNumbered = (format: (index: number) => string) => Array.from({length: 12}, (_, index) => ({
            headingBlockId: `s${index}`,
            number: format(index),
            title: `Scene ${index + 1}`,
        }));
        const shown = () => document.querySelectorAll('[data-scene-number]').length;

        renderArcs([
            {
                key: '__default-act__',
                name: 'ACT 1',
                scenes: scenesNumbered(index => `${index + 1}`),
            },
        ], ARCS, 300);
        await waitFor(() => document.querySelector('svg'));
        await waitFor(() => shown() > 0);

        const shortCount = shown();

        rerenderWide(scenesNumbered(index => `Scene ${index + 1} of twelve.`));
        await waitFor(() => shown() > 0 && shown() < shortCount);

        expect(shown()).toBeLessThan(shortCount);
    });
});
