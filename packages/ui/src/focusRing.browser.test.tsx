import '../styles/base.css';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

/*
 * Chrome's UA outline, the value half the editor toolbar used to fall back to
 * before `base.css` grew a baseline `:focus-visible` rule.
 */
const UA_OUTLINE_COLOR = 'rgb(0, 95, 204)';

const mount = (markup: string) => {
    const host = document.createElement('div');

    host.innerHTML = markup;
    document.body.appendChild(host);

    return host;
};

const focusFirstButton = async () => {
    await userEvent.tab();

    return document.activeElement as HTMLElement;
};

const getResolvedFocusRingColor = () => {
    const probe = document.createElement('div');

    probe.style.color = 'var(--color-focus-ring)';
    document.body.appendChild(probe);

    const color = window.getComputedStyle(probe).color;

    probe.remove();

    return color;
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('baseline focus ring', () => {
    it('rings a button that no component styled', async () => {
        mount('<button type="button">Undo</button>');

        const focused = await focusFirstButton();
        const outline = window.getComputedStyle(focused);

        expect(focused.tagName).toBe('BUTTON');
        expect(outline.outlineColor).toBe(getResolvedFocusRingColor());
        expect(outline.outlineColor).not.toBe(UA_OUTLINE_COLOR);
        expect(outline.outlineWidth).toBe('2px');
        expect(outline.outlineStyle).toBe('solid');
    });

    it('lets a component keep its own indicator', async () => {
        /*
         * The base rule sits entirely inside `:where()`, so it weighs nothing
         * and a single class beats it — the way the home script rows swap the
         * outline for an inset shadow.
         */
        mount(`
            <style>.opt-out:focus-visible { outline: none; box-shadow: inset 0 0 0 2px red; }</style>
            <button type="button" class="opt-out">Open script</button>
        `);

        const focused = await focusFirstButton();
        const outline = window.getComputedStyle(focused);

        expect(outline.outlineStyle).toBe('none');
    });

    it('leaves the script canvas without a ring', async () => {
        mount('<div contenteditable="true" tabindex="0">scene text</div>');

        const focused = await focusFirstButton();
        const outline = window.getComputedStyle(focused);

        expect(focused.getAttribute('contenteditable')).toBe('true');
        expect(outline.outlineWidth).not.toBe('2px');
    });
});
