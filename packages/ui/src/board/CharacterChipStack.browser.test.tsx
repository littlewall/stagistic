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
import {type BoardCharacterChip, CharacterChipStack} from './CharacterChipStack';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const renderStack = (characters: BoardCharacterChip[]) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            <button type="button">before</button>
            <CharacterChipStack characters={characters} />
        </>,
    );
};

const chip = (id: string, overrides: Partial<BoardCharacterChip> = {}): BoardCharacterChip => ({
    id,
    name: id.toUpperCase(),
    color: '#cc3344',
    level: 'present',
    ...overrides,
});

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const dots = () => [...document.querySelectorAll<HTMLElement>('[data-level]')];

describe('CharacterChipStack', () => {
    it('renders nothing for a scene without characters', () => {
        renderStack([]);

        expect(document.querySelector('[aria-label^="Characters"]')).toBeNull();
    });

    it('fills dots for characters in the script', async () => {
        renderStack([
            chip('anna'),
            chip('ben', {color: '#2266cc'}),
            chip('clara', {color: '#22aa66'}),
        ]);
        await waitFor(() => dots()[0]);

        const [
            anna,
            ben,
            clara,
        ] = dots().map(dot => getComputedStyle(dot));

        expect(dots().map(dot => dot.dataset.level)).toEqual([
            'present',
            'present',
            'present',
        ]);
        expect(requireValue(anna, 'anna').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(requireValue(ben, 'ben').backgroundColor).not.toBe(requireValue(anna, 'anna').backgroundColor);
        expect(requireValue(clara, 'clara').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(requireValue(clara, 'clara').borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('draws an unconfirmed character in a neutral color', async () => {
        renderStack([chip('anna'), chip('doctor', {color: null})]);
        await waitFor(() => dots()[1]);

        const [anna, doctor] = dots().map(dot => getComputedStyle(dot).backgroundColor);

        expect(doctor).not.toBe(anna);
        expect(dots()[1]?.dataset.confirmed).toBe('false');
    });

    it('mutes dimmed characters', async () => {
        renderStack([chip('anna'), chip('ben', {isDimmed: true})]);
        await waitFor(() => dots()[1]);

        expect(getComputedStyle(requireValue(dots()[0], 'anna')).opacity).toBe('1');
        expect(Number(getComputedStyle(requireValue(dots()[1], 'ben')).opacity)).toBeLessThan(0.5);
    });

    it('summarizes the overflow instead of growing without bound', async () => {
        renderStack(Array.from({length: 11}, (_, index) => chip(`c${index}`)));
        await waitFor(() => dots()[0]);

        expect(dots()).toHaveLength(8);
        expect(document.body.textContent).toContain('+3');
    });

    it('names the characters for assistive tech and reveals them on keyboard focus', async () => {
        renderStack([
            chip('anna'),
            chip('ben'),
            chip('clara'),
        ]);

        const group = await waitFor(() => document.querySelector<HTMLElement>('[aria-label^="Characters"]'));

        expect(group.getAttribute('aria-label')).toBe('Characters: ANNA, BEN, CLARA');
        expect(document.querySelector('[role="tooltip"]')).toBeNull();

        await userEvent.tab();
        await userEvent.tab();

        expect(document.activeElement).toBe(group);

        const tooltip = await waitFor(() => document.querySelector('[role="tooltip"]'));

        expect(tooltip.textContent).toBe('ANNA, BEN, CLARA');
    });
});
