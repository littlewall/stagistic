import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';
import {createArcsLayout} from './arcsGeometry';
import {
    BoardArcs,
    type BoardArcsAct,
    type BoardArcsArc,
} from './BoardArcs';
import type {BoardCharacterActions} from './BoardCharacterPopover';

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
        key: 'a1',
        name: 'ACT ONE',
        scenes: [
            {
                headingBlockId: 's0',
                number: '1.',
                title: 'Prologue',
            },
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
                hasStoredValue: true,
                evidence: true,
                note: 'Waits for the letter',
            },
        ],
    },
    {
        id: 'c-cy',
        name: 'CY',
        color: '#2266cc',
        points: [],
    },
];

const noopActions: BoardCharacterActions = {
    onNoteCommit: () => undefined,
    onRemove: () => undefined,
    onConfirm: () => undefined,
};

/* A Board whose writes land: a point set or removed shows up in the arcs, as with the real store. */
const StatefulArcs = ({initial}: {initial: BoardArcsArc[]}) => {
    const [arcs, setArcs] = useState(initial);

    return (
        <BoardArcs
            acts={ACTS}
            arcs={arcs}
            onSetPoint={(headingBlockId, characterId, value) => setArcs(previous => previous.map(arc => (arc.id !== characterId ? arc : {
                ...arc,
                points: [
                    ...arc.points.filter(item => item.headingBlockId !== headingBlockId),
                    {
                        headingBlockId,
                        sceneIndex: ACTS[0].scenes.findIndex(scene => scene.headingBlockId === headingBlockId),
                        value,
                        hasStoredValue: true,
                        evidence: false,
                        note: null,
                    },
                ],
            })))}
            onRemovePoint={(headingBlockId, characterId) => setArcs(previous => previous.map(arc => (arc.id !== characterId ? arc : {
                ...arc,
                points: arc.points.filter(item => item.headingBlockId !== headingBlockId),
            })))}
            characterActions={() => noopActions}
        />
    );
};

const setupStateful = (arcs: BoardArcsArc[] = ARCS) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            <StatefulArcs initial={arcs} />
        </>,
    );
};

const setup = (isEditable = true, arcs: BoardArcsArc[] = ARCS) => {
    const onSetPoint = vi.fn();
    const onRemovePoint = vi.fn();
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            <BoardArcs
                acts={ACTS}
                arcs={arcs}
                onSetPoint={isEditable ? onSetPoint : undefined}
                onRemovePoint={isEditable ? onRemovePoint : undefined}
                characterActions={isEditable ? () => noopActions : undefined}
            />
        </>,
    );

    return {onSetPoint, onRemovePoint};
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const arcPath = (id: string) => document.querySelector<SVGPathElement>(`[data-arc-path="${id}"]`);

const activate = async (id: string) => {
    (await waitFor(() => arcPath(id))).focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => arcPath(id)?.getAttribute('aria-pressed') === 'true');
};

const svg = () => requireValue(document.querySelector<SVGSVGElement>('svg'), 'chart');

const layout = () => {
    const rect = svg().getBoundingClientRect();

    return createArcsLayout(rect.width, rect.height, ACTS[0].scenes.length);
};

const stop = (index: number) => document.querySelector<SVGElement>(`[data-stop="${index}"]`);

const ring = (index: number) => stop(index)?.nextElementSibling ?? null;

const point = (id: string, sceneIndex: number) => document.querySelector<SVGCircleElement>(`[data-point="${id}:${sceneIndex}"]`);

/* The viewport position of a scene column at a value. */
const at = (sceneIndex: number, value: number) => {
    const rect = svg().getBoundingClientRect();
    const chart = layout();

    return {
        clientX: rect.left + chart.sceneX(sceneIndex),
        clientY: rect.top + chart.valueY(value),
    };
};

const pointer = (target: Element, type: string, position: {clientX: number, clientY: number}) => {
    target.dispatchEvent(new PointerEvent(type, {
        ...position,
        bubbles: true,
        pointerId: 7,
        button: 0,
    }));
};

const clickAt = (target: Element, position: {clientX: number, clientY: number}) => {
    target.dispatchEvent(new MouseEvent('click', {
        ...position,
        bubbles: true,
    }));
};

const dialog = () => document.querySelector('[role="dialog"]');

const buttonNamed = (label: string) => [...document.querySelectorAll<HTMLElement>('button')].find(item => item.textContent?.trim() === label);

describe('BoardArcs editing', () => {
    it('drags an implicit anchor into a stored point and restores it on delete', async () => {
        setupStateful();
        await activate('c-cy');

        const anchor = await waitFor(() => document.querySelector('[data-anchor="c-cy:0"]'));

        pointer(anchor, 'pointerdown', at(0, 0));
        pointer(anchor, 'pointermove', at(0, 50));
        pointer(anchor, 'pointerup', at(0, 50));
        await waitFor(() => point('c-cy', 0));
        expect(document.querySelector('[data-anchor="c-cy:0"]')).toBeNull();
        await userEvent.keyboard('{Delete}');
        await waitFor(() => document.querySelector('[data-anchor="c-cy:0"]'));
        expect(point('c-cy', 0)).toBeNull();
    });

    it('adds through overlapping baseline curves with a real pointer click', async () => {
        setupStateful();
        await activate('c-cy');
        await userEvent.click(requireValue(stop(1), 'baseline hit area'));

        const added = await waitFor(() => point('c-cy', 1));

        expect(Number(added.getAttribute('y')) + 4).toBeCloseTo(layout().baselineY);
        expect(arcPath('c-cy')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('snaps the preview and added point to the closest curve without selecting a character first', async () => {
        const makeArc = (id: string, value: number): BoardArcsArc => ({
            id,
            name: id,
            color: '#2266cc',
            points: [0, 2].map(sceneIndex => ({
                headingBlockId: `s${sceneIndex}`,
                sceneIndex,
                value,
                hasStoredValue: true,
                evidence: true,
                note: null,
            })),
        });
        const {onSetPoint} = setup(true, [makeArc('upper', 60), makeArc('lower', -40)]);
        const column = await waitFor(() => stop(1) ?? document.querySelector<SVGElement>('[aria-label="Add arc point in Kitchen"]'));

        pointer(column, 'pointermove', at(1, 45));

        const ghost = await waitFor(() => document.querySelector('[data-ghost="upper"] circle'));

        expect(Number(ghost.getAttribute('cy'))).toBeCloseTo(layout().valueY(60));
        clickAt(column, at(1, 45));
        expect(onSetPoint).toHaveBeenCalledExactlyOnceWith('s1', 'upper', 60);
        pointer(column, 'pointermove', at(1, -55));

        const lower = await waitFor(() => document.querySelector('[data-ghost="lower"] circle'));

        expect(Number(lower.getAttribute('cy'))).toBeCloseTo(layout().valueY(-40));
        clickAt(column, at(1, -55));
        expect(onSetPoint).toHaveBeenLastCalledWith('s1', 'lower', -40);
    });

    it('does not move an existing point by clicking its column', async () => {
        const {onSetPoint} = setup(true, [ARCS[0]]);

        await activate('c-anna');
        clickAt(requireValue(stop(1), 'kitchen column'), at(1, -30));
        expect(onSetPoint).not.toHaveBeenCalled();
    });

    it('offers point creation before any character is selected for keyboard editing', async () => {
        const {onSetPoint} = setup();
        const column = await waitFor(() => document.querySelector<SVGElement>('[aria-label="Add arc point in Prologue"]'));

        pointer(column, 'pointermove', at(0, 10));
        await waitFor(() => document.querySelector('[data-ghost]'));
        clickAt(column, at(0, 10));
        expect(onSetPoint).toHaveBeenCalledExactlyOnceWith('s0', 'c-anna', 0);
    });

    it('shows a ghost in the character color with its name, snapped to the scene column', async () => {
        setup();

        await activate('c-cy');

        const column = requireValue(stop(2), 'garden column');
        const position = at(2, 0);

        pointer(column, 'pointermove', {clientX: position.clientX - 6, clientY: position.clientY});

        const ghost = await waitFor(() => document.querySelector('[data-ghost="c-cy"]'));
        const ghostDot = requireValue(ghost.querySelector('circle'), 'ghost dot');

        expect(Number(ghostDot.getAttribute('cx'))).toBeCloseTo(layout().sceneX(2));
        expect(ghostDot.getAttribute('fill')).toBe('#2266cc');
        expect(ghost.textContent).toBe('CY');

        /* React derives pointerleave from pointerout. */
        pointer(column, 'pointerout', position);
        await waitFor(() => !document.querySelector('[data-ghost]'));
    });

    it('drags a point vertically and writes on release', async () => {
        const {onSetPoint} = setup();

        await activate('c-anna');

        const circle = requireValue(point('c-anna', 1), 'anna point');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointermove', at(1, 60));
        pointer(circle, 'pointermove', at(1, 80));

        expect(onSetPoint).not.toHaveBeenCalled();
        await waitFor(() => Math.abs(Number(circle.getAttribute('cy')) - layout().valueY(80)) < 1);

        pointer(circle, 'pointerup', at(1, 80));

        expect(onSetPoint).toHaveBeenCalledExactlyOnceWith('s1', 'c-anna', 80);
    });

    it('restores the original position when Escape ends a drag', async () => {
        const {onSetPoint} = setup();

        await activate('c-anna');

        const circle = requireValue(point('c-anna', 1), 'anna point');
        const original = circle.getAttribute('cy');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointermove', at(1, 90));
        await waitFor(() => circle.getAttribute('cy') !== original);

        await userEvent.keyboard('{Escape}');
        await waitFor(() => circle.getAttribute('cy') === original);
        pointer(circle, 'pointerup', at(1, 90));

        expect(onSetPoint).not.toHaveBeenCalled();
        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('true');
        expect(dialog()).toBeNull();
    });

    it('opens the character popover on a click on the point and removes only the point from it', async () => {
        const {onRemovePoint} = setup();

        await activate('c-anna');

        const circle = requireValue(point('c-anna', 1), 'anna point');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointerup', at(1, 40));

        const open = await waitFor(dialog);

        expect(open.textContent).toContain('ANNA');
        expect(open.textContent).toContain('2. Kitchen');
        expect(open.textContent).not.toMatch(/\b40\b/);
        expect(open.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Waits for the letter');

        await userEvent.click(requireValue(buttonNamed('Remove point'), 'remove point'));

        expect(onRemovePoint).toHaveBeenCalledExactlyOnceWith('s1', 'c-anna');
        await waitFor(() => !dialog());
    });

    it('offers no point removal for a point that has no stored value', async () => {
        setup(true, [
            {
                ...ARCS[0],
                points: [
                    {
                        headingBlockId: 's1',
                        sceneIndex: 1,
                        value: 0,
                        hasStoredValue: false,
                        evidence: true,
                        note: 'Wall note',
                    },
                ],
            },
            ARCS[1],
        ]);
        await activate('c-anna');

        const circle = requireValue(point('c-anna', 1), 'note point');

        pointer(circle, 'pointerdown', at(1, 0));
        pointer(circle, 'pointerup', at(1, 0));

        const open = await waitFor(dialog);

        expect(open.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Wall note');
        expect(buttonNamed('Remove point')).toBeUndefined();
    });

    it('offers only point removal for a character manually present on the card', async () => {
        const {onRemovePoint} = setup(true, [
            {
                ...ARCS[0],
                points: [
                    {
                        ...ARCS[0].points[0],
                        evidence: false,
                    },
                ],
            },
        ]);

        await userEvent.click(await waitFor(() => point('c-anna', 1)));
        await waitFor(dialog);
        expect(buttonNamed('Remove from card')).toBeUndefined();
        expect(dialog()?.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Waits for the letter');
        await userEvent.click(requireValue(buttonNamed('Remove point')));
        expect(onRemovePoint).toHaveBeenCalledExactlyOnceWith('s1', 'c-anna');
    });

    it('is one tab stop over the scenes; arrows move across scenes, up/down steps the point', async () => {
        const {onSetPoint} = setup();

        await activate('c-anna');

        expect(document.querySelectorAll('[data-stop][tabindex="0"]')).toHaveLength(1);
        expect(document.querySelectorAll('[data-stop]')).toHaveLength(3);

        requireValue(stop(0), 'first column').focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(document.activeElement).toBe(stop(1));
        expect(stop(1)?.getAttribute('tabindex')).toBe('0');
        expect(stop(0)?.getAttribute('tabindex')).toBe('-1');
        expect(stop(1)?.getAttribute('aria-label')).toBe('ANNA, Scene 2. Kitchen, clearly better');

        await userEvent.keyboard('{ArrowUp}');
        expect(onSetPoint).toHaveBeenLastCalledWith('s1', 'c-anna', 50);

        await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
        expect(onSetPoint).toHaveBeenLastCalledWith('s1', 'c-anna', 39);

        await userEvent.keyboard('{ArrowLeft}');
        expect(document.activeElement).toBe(stop(0));
        expect(stop(0)?.getAttribute('aria-label')).toBe('ANNA, Scene 1. Prologue, no point');

        /* A scene without a point: the first press creates it at the baseline and moves. */
        await userEvent.keyboard('{ArrowUp}');
        expect(onSetPoint).toHaveBeenLastCalledWith('s0', 'c-anna', 10);

        await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
        expect(onSetPoint).toHaveBeenLastCalledWith('s0', 'c-anna', -1);
    });

    it('opens the popover with Enter, returns focus on Escape and deletes with Delete', async () => {
        const {onRemovePoint} = setup();

        await activate('c-anna');
        requireValue(stop(1), 'kitchen column').focus();

        await userEvent.keyboard('{Enter}');
        await waitFor(dialog);

        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());
        await waitFor(() => document.activeElement === stop(1));

        await userEvent.keyboard('{Delete}');
        expect(onRemovePoint).toHaveBeenCalledExactlyOnceWith('s1', 'c-anna');

        /* Delete needs a point. */
        requireValue(stop(0), 'prologue column').focus();
        await userEvent.keyboard('{Delete}');
        await userEvent.keyboard('{Backspace}');
        expect(dialog()).toBeNull();
        expect(onRemovePoint).toHaveBeenCalledTimes(1);
    });

    it('is read-only without the write callbacks: no ghost, no click-to-add, no drag, no popover', async () => {
        const {onSetPoint, onRemovePoint} = setup(false);

        await activate('c-anna');

        expect(document.querySelectorAll('[data-stop]')).toHaveLength(0);

        const circle = requireValue(point('c-anna', 1), 'anna point');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointermove', at(1, 80));
        pointer(circle, 'pointerup', at(1, 80));
        clickAt(svg(), at(2, 10));

        expect(onSetPoint).not.toHaveBeenCalled();
        expect(onRemovePoint).not.toHaveBeenCalled();
        expect(document.querySelector('[data-ghost]')).toBeNull();
        expect(dialog()).toBeNull();
        expect(buttonNamed('Remove point')).toBeUndefined();
    });

    it('uses the UI font, not mono, for the ghost label', async () => {
        setup();

        await activate('c-cy');

        const column = requireValue(stop(2), 'garden column');

        pointer(column, 'pointermove', at(2, 0));

        const label = requireValue((await waitFor(() => document.querySelector('[data-ghost="c-cy"]'))).querySelector('text'), 'ghost label');
        const family = getComputedStyle(label).fontFamily;

        expect(family).toContain('IBM Plex Sans');
        expect(family).not.toMatch(/mono/i);
    });

    it('leaves the active character on Escape wherever the focus is, but only closes a popover first', async () => {
        setup();

        await activate('c-anna');

        /* After a drag, the focus is on the chart and Escape goes to the overview. */
        const circle = requireValue(point('c-anna', 1), 'anna point');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointermove', at(1, 80));
        pointer(circle, 'pointerup', at(1, 80));
        await userEvent.keyboard('{Escape}');
        await waitFor(() => arcPath('c-anna')?.getAttribute('aria-pressed') === 'false');

        /* An open popover takes the Escape; the character stays active. */
        await activate('c-anna');
        pointer(requireValue(point('c-anna', 1), 'anna point'), 'pointerdown', at(1, 40));
        pointer(requireValue(point('c-anna', 1), 'anna point'), 'pointerup', at(1, 40));
        await waitFor(dialog);
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());

        expect(arcPath('c-anna')?.getAttribute('aria-pressed')).toBe('true');

        await userEvent.keyboard('{Escape}');
        await waitFor(() => arcPath('c-anna')?.getAttribute('aria-pressed') === 'false');
    });

    it('moves the focus to the scene\'s stop after a mouse edit, without a visible ring', async () => {
        setup();

        await activate('c-anna');
        clickAt(requireValue(stop(2), 'garden column'), at(2, 0));
        await waitFor(() => document.activeElement === stop(2));

        const circle = requireValue(point('c-anna', 1), 'anna point');

        pointer(circle, 'pointerdown', at(1, 40));
        pointer(circle, 'pointermove', at(1, 80));
        pointer(circle, 'pointerup', at(1, 80));
        await waitFor(() => document.activeElement === stop(1));

        expect(document.documentElement.hasAttribute('data-focus-ring-visible')).toBe(false);
        expect(getComputedStyle(requireValue(ring(1), 'ring')).stroke).toBe('rgba(0, 0, 0, 0)');
    });

    it('opens an existing point directly and restores its scene focus when closed', async () => {
        setup();

        await userEvent.click(await waitFor(() => point('c-anna', 1)));
        await waitFor(dialog);
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());
        await waitFor(() => document.activeElement === stop(1));
    });

    it('rings the focused point for the keyboard, or the baseline where the scene has no point', async () => {
        setup();

        await activate('c-anna');
        requireValue(stop(0), 'prologue column').focus();
        await userEvent.keyboard('{ArrowRight}');

        const onPoint = requireValue(ring(1), 'ring on the point');

        expect(getComputedStyle(onPoint).stroke).not.toBe('rgba(0, 0, 0, 0)');
        expect(Number(onPoint.getAttribute('cy'))).toBeCloseTo(layout().valueY(40));
        expect(getComputedStyle(requireValue(ring(0), 'other ring')).stroke).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(requireValue(stop(1), 'column')).fill).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(requireValue(stop(1), 'column')).outlineStyle).toBe('none');

        await userEvent.keyboard('{ArrowLeft}');

        const onBaseline = requireValue(ring(0), 'ring on the baseline');

        expect(getComputedStyle(onBaseline).stroke).not.toBe('rgba(0, 0, 0, 0)');
        expect(Number(onBaseline.getAttribute('cy'))).toBeCloseTo(layout().baselineY);
    });

    it('removes a point with Backspace as with Delete', async () => {
        const {onRemovePoint} = setup();

        await activate('c-anna');
        requireValue(stop(1), 'kitchen column').focus();
        await userEvent.keyboard('{Backspace}');

        expect(onRemovePoint).toHaveBeenCalledExactlyOnceWith('s1', 'c-anna');
    });

    it('creates a point at the baseline on Enter or Space in a scene without one, and opens its popover', async () => {
        setupStateful();

        await activate('c-anna');
        requireValue(stop(0), 'prologue column').focus();
        await userEvent.keyboard('{Enter}');

        await waitFor(dialog);
        await waitFor(() => point('c-anna', 0));
        expect(Number(point('c-anna', 0)?.getAttribute('y')) + 4).toBeCloseTo(layout().baselineY);
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());
        await waitFor(() => document.activeElement === stop(0));

        requireValue(stop(2), 'garden column').focus();
        await userEvent.keyboard(' ');
        await waitFor(dialog);
        await waitFor(() => point('c-anna', 2));
    });
});
