import '../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Input} from './Input';

let mountedRoot: Root | null = null;

const getRgb = (color: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context is unavailable');
    }

    canvas.width = 1;
    canvas.height = 1;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);

    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
};

const getRelativeLuminance = (color: string) => {
    const channels = getRgb(color).map(channel => {
        const value = channel / 255;

        return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const getContrastRatio = (foreground: string, background: string) => {
    const foregroundLuminance = getRelativeLuminance(foreground);
    const backgroundLuminance = getRelativeLuminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
    delete document.documentElement.dataset.theme;
});

describe('Input accessibility styles', () => {
    it('shows a keyboard focus ring and an opaque placeholder', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        mountedRoot = createRoot(host);
        mountedRoot.render(<Input aria-label="Title" placeholder="Untitled" />);

        await userEvent.tab();

        const input = host.querySelector<HTMLInputElement>('input');
        const styles = window.getComputedStyle(input as HTMLInputElement);
        const placeholderStyles = window.getComputedStyle(
            input as HTMLInputElement,
            '::placeholder',
        );

        expect(document.activeElement).toBe(input);
        expect(styles.outlineStyle).toBe('solid');
        expect(styles.outlineWidth).toBe('2px');
        expect(styles.outlineOffset).toBe('2px');
        expect(placeholderStyles.opacity).toBe('1');
        expect(getContrastRatio(
            placeholderStyles.color,
            styles.backgroundColor,
        )).toBeGreaterThanOrEqual(4.5);

        document.documentElement.dataset.theme = 'dark';
        await new Promise(resolve => window.setTimeout(resolve, 200));

        const darkStyles = window.getComputedStyle(input as HTMLInputElement);
        const darkPlaceholderStyles = window.getComputedStyle(
            input as HTMLInputElement,
            '::placeholder',
        );

        expect(getContrastRatio(
            darkPlaceholderStyles.color,
            darkStyles.backgroundColor,
        )).toBeGreaterThanOrEqual(4.5);
    });
});
