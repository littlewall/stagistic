import {readFileSync} from 'node:fs';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {isMenuAction, MENU_ACTIONS} from './menuActions';

const menuRs = readFileSync(new URL('../../src-tauri/src/menu.rs', import.meta.url), 'utf8');

// The ids Rust emits are listed once, in its `frontend_actions!` block.
const rustFrontendActions = (): string[] => {
    const block = (/frontend_actions!\s*\{([^}]*)\}/).exec(menuRs)?.[1] ?? '';

    return [...block.matchAll(/=\s*"([^"]+)"/g)].map(match => match[1]);
};

describe('menu action ids', () => {
    it('match the ids Rust emits', () => {
        expect(rustFrontendActions().toSorted()).toEqual([...MENU_ACTIONS].toSorted());
    });

    it('recognises only known actions', () => {
        expect(isMenuAction('script.save')).toBe(true);
        expect(isMenuAction('view.zoom-in')).toBe(false);
        expect(isMenuAction(undefined)).toBe(false);
    });
});
