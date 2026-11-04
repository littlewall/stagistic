import {requireValue} from '@stagistic/shared';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    ACTS,
    ELI,
    MARA,
    mount,
    row,
    song,
    unmount,
    waitFor,
} from './BoardRundown.fixtures';

afterEach(unmount);

describe('BoardRundown', () => {
    it('shows the act summary, scenes, indented songs and the kind tags', async () => {
        mount();

        const section = await waitFor(() => document.querySelector('section[aria-label="ACT ONE"]'));

        expect(section.textContent).toContain('2 scenes · 2 songs');
        expect(section.textContent).toContain('The Lighthouse');
        expect(section.textContent).toContain('1.B)');
        expect(row('Song 1.B, Storm, Instrumental').textContent).toContain('Instrumental');
        expect(row('Song 0, Overture, Hit').textContent).toContain('Hit');
        expect(row('Song 1.A, Small Light, sung by MARA, ELI').textContent).toContain('Song');
        expect(row('Song 1.A, Small Light, sung by MARA, ELI').textContent).not.toMatch(/Instrumental|Hit/);
        expect(section.textContent).not.toMatch(/pp?\./);
        expect(requireValue(row('Song 1.A, Small Light, sung by MARA, ELI').querySelector('span')).getBoundingClientRect().left)
            .toBeGreaterThan(requireValue(row('Scene 1, The Lighthouse, MARA, ELI, ROOK').querySelector('span')).getBoundingClientRect().left);
    });

    it('names rows for screen readers and puts the pre-scene song above the first act', async () => {
        mount();
        await waitFor(() => document.querySelector('[data-row]'));

        expect(row('Scene 1, The Lighthouse, MARA, ELI, ROOK')).toBeTruthy();
        expect(row('Scene 2, The Harbour, ROOK')).toBeTruthy();
        expect(row('Song 1.A, Small Light, sung by MARA, ELI')).toBeTruthy();
        expect(row('Song 0, Overture, Hit').compareDocumentPosition(row('Scene 1, The Lighthouse, MARA, ELI, ROOK')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is one tab stop with arrows and Home/End between the rows', async () => {
        mount();
        await waitFor(() => document.querySelector('[data-row]'));

        const stops = [...document.querySelectorAll<HTMLElement>('[data-row]')].filter(element => element.tabIndex === 0);

        expect(stops).toHaveLength(1);

        stops[0].focus();
        await userEvent.keyboard('{ArrowDown}');
        expect(document.activeElement).toBe(row('Scene 1, The Lighthouse, MARA, ELI, ROOK'));
        await userEvent.keyboard('{ArrowDown}{ArrowDown}');
        expect(document.activeElement).toBe(row('Song 1.B, Storm, Instrumental'));
        await userEvent.keyboard('{End}');
        expect(document.activeElement).toBe(row('Scene 2, The Harbour, ROOK'));
        await userEvent.keyboard('{ArrowDown}');
        expect(document.activeElement).toBe(row('Scene 2, The Harbour, ROOK'));
        await userEvent.keyboard('{Home}');
        expect(document.activeElement).toBe(row('Song 0, Overture, Hit'));
        expect([...document.querySelectorAll<HTMLElement>('[data-row]')].filter(element => element.tabIndex === 0)).toHaveLength(1);
    });

    it('opens the scene heading or the song start on click and on Enter', async () => {
        const onOpen = vi.fn();

        mount(onOpen);
        await waitFor(() => document.querySelector('[data-row]'));

        await userEvent.click(row('Scene 2, The Harbour, ROOK'));
        expect(onOpen).toHaveBeenLastCalledWith('s2');

        row('Song 1.A, Small Light, sung by MARA, ELI').focus();
        await userEvent.keyboard('{Enter}');
        expect(onOpen).toHaveBeenLastCalledWith('d1');
    });

    it('shows the focus ring for the keyboard only', async () => {
        mount();
        await waitFor(() => document.querySelector('[data-row]'));

        const target = row('Scene 2, The Harbour, ROOK');

        await userEvent.click(target);
        expect(getComputedStyle(target).outlineStyle).toBe('none');

        await userEvent.keyboard('{ArrowUp}');
        await waitFor(() => getComputedStyle(document.activeElement as HTMLElement).outlineStyle !== 'none');
    });

    it('shows the act length and page lengths on rows, and names them for assistive tech', async () => {
        const [act] = ACTS;
        const [first, second] = act.scenes;

        mount(() => {}, [
            {
                ...act,
                pageLength: 4,
                scenes: [
                    {
                        ...first,
                        pageLength: 1.5,
                        songs: [song({pageLength: 0.5})],
                    },
                    {...second, pageLength: 2},
                ],
            },
        ]);

        const section = await waitFor(() => document.querySelector('section[aria-label="ACT ONE"]'));

        expect(requireValue(section.querySelector('h2')).getAttribute('aria-label')).toBe('ACT ONE, 4 pages');
        expect(requireValue(section.querySelector('[data-summary]')).textContent).toBe('2 scenes · 2 songs');

        const texts = [...section.querySelectorAll<HTMLElement>('[data-pages]')].map(element => element.textContent);

        expect(texts).toEqual([
            '4pp.',
            '1½pp.',
            '½p.',
            '2pp.',
        ]);
        expect(row('Scene 1, The Lighthouse, 1.5 pages, MARA, ELI, ROOK')).toBeTruthy();
        expect(row('Scene 2, The Harbour, 2 pages, ROOK')).toBeTruthy();
        expect(row('Song 1.A, Small Light, half a page, sung by MARA, ELI')).toBeTruthy();
    });

    it('names a song with kind then length, and a one page length', async () => {
        const [act] = ACTS;

        mount(() => {}, [
            {
                ...act,
                scenes: [
                    {
                        ...act.scenes[0],
                        songs: [
                            song({
                                kind: 'hit',
                                title: 'Thunderclap',
                                label: '2.B)',
                                singers: [],
                                pageLength: 1,
                            }),
                            song({
                                musicId: 'm9',
                                startBlockId: 'd9',
                                pageLength: 3,
                            }),
                        ],
                    },
                ],
            },
        ]);
        await waitFor(() => document.querySelector('[data-row]'));

        expect(row('Song 2.B, Thunderclap, Hit, 1 page')).toBeTruthy();
        expect(row('Song 1.A, Small Light, 3 pages, sung by MARA, ELI')).toBeTruthy();
    });

    it('names a scene by its ordinal when the scene number format hides numbers', async () => {
        mount(() => {}, ACTS, 'none');
        await waitFor(() => document.querySelector('[data-row]'));

        expect(row('Scene 1, The Lighthouse, MARA, ELI, ROOK')).toBeTruthy();
    });

    it('keeps two songs that start in one block as separate rows without key warnings', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const [act] = ACTS;

        mount(() => {}, [
            {
                ...act,
                scenes: [
                    {
                        ...act.scenes[0],
                        songs: [
                            song({musicId: 'ma', title: 'First'}),
                            song({musicId: 'mb', title: 'Second'}),
                        ],
                    },
                ],
            },
        ]);
        await waitFor(() => document.querySelector('[data-row]'));

        expect(row('Song 1.A, First, sung by MARA, ELI')).toBeTruthy();
        expect(row('Song 1.A, Second, sung by MARA, ELI')).toBeTruthy();
        expect(document.querySelectorAll('[data-row][tabindex="0"]')).toHaveLength(1);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('aligns people at 60% of the width, page lengths and kind tags on shared edges', async () => {
        const [act] = ACTS;
        const [lighthouse, harbour] = act.scenes;

        mount(undefined, [
            {
                ...act,
                pageLength: 4,
                scenes: [
                    {
                        ...lighthouse,
                        pageLength: 3,
                        songs: [
                            song({pageLength: 1.5}),
                            song({
                                musicId: 'm2',
                                label: '1.B)',
                                title: 'Storm',
                                kind: 'instrumental',
                                singers: [MARA],
                                pageLength: 0.5,
                            }),
                            song({
                                musicId: 'm3',
                                label: '1.C)',
                                title: 'Chorus',
                                kind: 'hit',
                                singers: [ELI],
                            }),
                        ],
                    },
                    {...harbour, pageLength: 1},
                ],
            },
        ]);
        await waitFor(() => document.querySelector('[data-row]'));

        const rundown = requireValue(document.querySelector('section')?.parentElement, 'rundown');
        const box = rundown.getBoundingClientRect();
        const people = [...document.querySelectorAll<HTMLElement>('[data-people]')];

        expect(people.length).toBeGreaterThan(2);
        people.forEach(element => {
            expect(Math.abs(element.getBoundingClientRect().left - (box.left + box.width * 0.6))).toBeLessThanOrEqual(1);
        });

        const cells = [...document.querySelectorAll<HTMLElement>('[data-pages]')];
        const numbers = cells.map(element => requireValue(element.firstElementChild).getBoundingClientRect());
        const units = cells.map(element => requireValue(element.lastElementChild).getBoundingClientRect());

        expect(cells.map(element => element.textContent)).toEqual([
            '4pp.',
            '3pp.',
            '1½pp.',
            '½p.',
            '1p.',
        ]);
        // Numbers share a right edge, units a left edge.
        expect(new Set(numbers.map(item => Math.round(item.right))).size).toBe(1);
        expect(new Set(units.map(item => Math.round(item.left))).size).toBe(1);

        const kinds = [...document.querySelectorAll<HTMLElement>('[data-kind]')];

        expect(kinds.length).toBeGreaterThan(2);
        expect(new Set(kinds.map(element => Math.round(element.getBoundingClientRect().right))).size).toBe(1);
    });

    it('puts the act row on the row columns: length over the page cells, summary under the people', async () => {
        const [act] = ACTS;

        mount(undefined, [
            {
                ...act,
                pageLength: 2,
                scenes: [{...act.scenes[0], pageLength: 1}, act.scenes[1]],
            },
        ]);
        await waitFor(() => document.querySelector('[data-row]'));

        const range = requireValue(document.querySelector<HTMLElement>('section [data-pages]')).getBoundingClientRect();
        const summary = requireValue(document.querySelector<HTMLElement>('[data-summary]')).getBoundingClientRect();
        const pagesCell = requireValue(document.querySelector<HTMLElement>('[data-row] [data-pages]')).getBoundingClientRect();
        const people = requireValue(document.querySelector<HTMLElement>('[data-people]')).getBoundingClientRect();

        expect(Math.abs(summary.left - people.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(range.left - pagesCell.left)).toBeLessThanOrEqual(1);
    });
});
