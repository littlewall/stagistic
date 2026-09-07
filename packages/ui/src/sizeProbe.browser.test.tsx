import '../styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {describe, it} from 'vite-plus/test';

import {Button} from './atoms/Button';
import {Select} from './molecules/forms/Select';

const TOKENS = [
    '--space-xs',
    '--space-sm',
    '--space-md',
    '--space-lg',
    '--space-xl',
    '--space-2xl',
    '--space-3xl',
    '--space-4xl',
    '--space-5xl',
    '--space-6xl',
    '--space-7xl',
    '--radius-xs',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-xl',
    '--font-size-xxs',
    '--font-size-xs',
    '--font-size-sm',
    '--font-size-md',
    '--font-size-lg',
    '--font-size-xl',
    '--font-size-2xl',
    '--font-size-3xl',
    '--font-size-4xl',
    '--control-height-xs',
    '--control-height-sm',
    '--control-height-md',
    '--control-height-lg',
    '--shell-height',
    '--sidebar-width',
    '--control-chevron-size',
    '--menu-max-height',
    '--menu-item-min-height',
    '--bubble-menu-button-size',
    '--bubble-menu-icon-size',
];

/*
 * A token is a calc() expression today, so getPropertyValue returns the
 * expression rather than a length. Resolving it needs a real element that
 * uses it.
 */
const resolveToken = (name: string) => {
    const probe = document.createElement('div');

    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    /*
     * Measured 64x and divided back down. Layout quantises to 1/64px, so a
     * direct read returns 8.64px as 8.625; multiplying first pushes that error
     * to 1/4096px and the comparison stays sharp.
     */
    probe.style.width = `calc(var(${name}) * 64)`;
    document.body.appendChild(probe);

    const width = Number.parseFloat(window.getComputedStyle(probe).width) / 64;

    probe.remove();

    return Math.round(width * 10000) / 10000;
};

const settle = async () => {
    await new Promise(resolve => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
        });
    });
    await document.fonts.ready;
    await new Promise(resolve => {
        window.setTimeout(resolve, 500);
    });
};

const measure = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return {
        w: Math.round(rect.width * 1000) / 1000,
        h: Math.round(rect.height * 1000) / 1000,
        fontSize: style.fontSize,
        paddingTop: style.paddingTop,
        paddingLeft: style.paddingLeft,
        borderTopWidth: style.borderTopWidth,
        borderRadius: style.borderTopLeftRadius,
    };
};

describe('sizeProbe', () => {
    it('dumps every measured size', async () => {
        const host = document.createElement('div');

        host.style.width = '1000px';
        document.body.appendChild(host);

        const root: Root = createRoot(host);

        /*
         * Two real components with APIs verified against their source, plus a
         * raw box per token family. The raw boxes are immune to component
         * refactors, so a diff in them is unambiguously a ladder change.
         */
        root.render(
            <div>
                <div
                    data-probe="rawControl"
                    style={{
                        height: 'var(--control-height-md)',
                        padding: 'var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                    }}
                />
                <div
                    data-probe="rawMenuItem"
                    style={{
                        minHeight: 'var(--menu-item-min-height)',
                        padding: 'var(--space-sm) var(--space-lg)',
                        fontSize: 'var(--font-size-md)',
                    }}
                />
                <div
                    data-probe="rawShell"
                    style={{
                        height: 'var(--shell-height)',
                        width: 'var(--sidebar-width)',
                    }}
                />
                <div data-probe="button">
                    <Button>Button</Button>
                </div>
                <div data-probe="select">
                    <Select
                        ariaLabel="Select"
                        value="a"
                        options={[{value: 'a', label: 'Option A'}]}
                        onChange={() => {}}
                    />
                </div>
            </div>,
        );

        await settle();

        const tokens: Record<string, number> = {};

        TOKENS.forEach(name => {
            tokens[name] = resolveToken(name);
        });

        const boxes: Record<string, ReturnType<typeof measure>> = {};

        host.querySelectorAll('[data-probe]').forEach(element => {
            const key = element.getAttribute('data-probe') ?? '?';
            const target = element.firstElementChild ?? element;

            boxes[key] = measure(target);
        });

        root.unmount();
        host.remove();

        throw new Error(`__PROBE__${JSON.stringify({tokens, boxes})}__END__`);
    });
});
