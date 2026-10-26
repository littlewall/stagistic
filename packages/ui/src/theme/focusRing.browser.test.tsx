import '../../styles/base.css';

import {createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';

let root: Root | null = null;

// Keep the baseline ring distinct from Chrome's default outline.
const UA_OUTLINE_COLOR = 'rgb(0, 95, 204)';

const mount = async (markup: string) => {
    const host = document.createElement('div');
    const manager = document.createElement('div');

    host.innerHTML = markup;
    document.body.append(manager, host);
    root = createRoot(manager);
    root.render(createElement(FocusVisibilityManager));
    await new Promise(resolve => requestAnimationFrame(resolve));

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
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('baseline focus ring', () => {
    it('styles custom tab stops through the application signal', async () => {
        await mount('<span role="button" tabindex="0">Choose color</span>');

        const focused = await focusFirstButton();

        expect(focused.tagName).toBe('SPAN');
        expect(window.getComputedStyle(focused).outlineStyle).toBe('solid');
        expect(window.getComputedStyle(focused).outlineColor).toBe(getResolvedFocusRingColor());
    });

    it('suppresses inherited native outlines on custom tab stops after text entry', async () => {
        const host = await mount('<input aria-label="Title"><span role="button" tabindex="0">Choose color</span>');
        const input = host.querySelector('input') as HTMLInputElement;
        const target = host.querySelector('span') as HTMLSpanElement;

        await userEvent.click(input);
        target.focus();
        expect(window.getComputedStyle(target).outlineStyle).toBe('none');
    });

    it('rings a button that no component styled', async () => {
        await mount('<button type="button" tabindex="0">Undo</button>');

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
        await mount(`
            <style>:root[data-focus-ring-visible] .opt-out:focus { outline: none; box-shadow: inset 0 0 0 2px red; }</style>
            <button type="button" tabindex="0" class="opt-out">Open script</button>
        `);

        const focused = await focusFirstButton();
        const outline = window.getComputedStyle(focused);

        expect(focused.tagName).toBe('BUTTON');
        expect(outline.outlineStyle).toBe('none');
    });

    it('leaves the script canvas without a ring', async () => {
        await mount('<div contenteditable="true" tabindex="0">scene text</div>');

        const focused = await focusFirstButton();
        const outline = window.getComputedStyle(focused);

        expect(focused.getAttribute('contenteditable')).toBe('true');
        expect(outline.outlineWidth).not.toBe('2px');
    });
});
