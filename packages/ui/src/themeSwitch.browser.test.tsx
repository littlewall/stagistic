import '../styles/base.css';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {applyAppThemeMode} from './theme';

/* A hover duration a component picked for itself, i.e. one the swap must not touch. */
const COMPONENT_DURATION = '0.15s';

const mountProbe = (inlineStyle: string) => {
    const probe = document.createElement('div');

    probe.setAttribute('style', inlineStyle);
    document.body.appendChild(probe);

    return probe;
};

const findRule = (selectorText: string) => {
    return [...document.styleSheets]
        .flatMap(sheet => [...sheet.cssRules])
        .find((rule): rule is CSSStyleRule => {
            return rule instanceof CSSStyleRule && rule.selectorText.includes(selectorText);
        });
};

afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-theme', 'light');
});

describe('theme swap cross-fade', () => {
    it('cross-fades the page with a view transition instead of a transition per element', async () => {
        document.documentElement.setAttribute('data-theme', 'light');

        const probe = mountProbe('background: var(--color-bg)');

        expect(typeof document.startViewTransition).toBe('function');

        applyAppThemeMode('dark');

        /*
         * The whole point of moving to the compositor: no element is animating. A
         * document-wide `transition` here is what cost 184ms per frame on a long
         * script, so an element picking one up again is a regression, not a detail.
         */
        expect(window.getComputedStyle(probe).transitionDuration).toBe('0s');

        await expect
            .poll(() => document.documentElement.getAttribute('data-theme'))
            .toBe('dark');

        expect(window.getComputedStyle(probe).transitionDuration).toBe('0s');
    });

    it('leaves a component animating on its own timing', async () => {
        document.documentElement.setAttribute('data-theme', 'light');

        const probe = mountProbe(`background: var(--color-surface); transition: background ${COMPONENT_DURATION} ease`);

        applyAppThemeMode('dark');

        expect(window.getComputedStyle(probe).transitionDuration).toBe(COMPONENT_DURATION);

        await expect
            .poll(() => document.documentElement.getAttribute('data-theme'))
            .toBe('dark');

        expect(window.getComputedStyle(probe).transitionDuration).toBe(COMPONENT_DURATION);
    });

    it('times the cross-fade from the theme token', () => {
        const rule = findRule('::view-transition-new(root)');

        expect(rule?.style.animationDuration).toBe('var(--duration-theme)');
        expect(rule?.style.animationTimingFunction).toBe('var(--ease-theme)');
    });
});
