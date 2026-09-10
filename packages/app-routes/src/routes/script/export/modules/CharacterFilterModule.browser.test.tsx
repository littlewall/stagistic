import '@stagistic/ui/styles/base.css';

import type {
    CharacterFilterValue,
    ExportCharacter,
} from '@stagistic/export';
import {useState} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {CharacterFilterModule} from './CharacterFilterModule';

const roots: Root[] = [];

const characters: ExportCharacter[] = [
    {
        id: 'anna', key: 'ANNA', displayName: 'Anna',
    }, {
        id: 'stage-manager', key: 'STAGE_MANAGER', displayName: 'Stage Manager',
    },
];

const DEFAULT_VALUE: CharacterFilterValue = {
    mode: 'only',
    characterIds: [],
    preserveFullScriptPagination: true,
};

const Harness = ({initialValue}: {initialValue: CharacterFilterValue}) => {
    const [value, setValue] = useState<CharacterFilterValue>(initialValue);

    return (
        <CharacterFilterModule
            characters={characters}
            value={value}
            onChange={setValue}
        />
    );
};

const mount = (initialValue = DEFAULT_VALUE) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(<Harness initialValue={initialValue} />);
    roots.push(root);
};

const waitFor = async <Value, >(getValue: () => Value | null): Promise<Value> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for character filter.');
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('CharacterFilterModule', () => {
    it('selects every character when selected-only mode starts empty', async () => {
        mount({
            mode: 'all',
            characterIds: [],
            preserveFullScriptPagination: true,
        });

        const selectedOnly = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLLabelElement>('label'))
            .find(label => label.textContent?.trim() === 'Selected characters only') ?? null);

        await userEvent.click(selectedOnly);

        const anna = await waitFor(() => document.querySelector<HTMLButtonElement>(
            'button[aria-label="Anna"]',
        ));
        const stageManager = document.querySelector<HTMLButtonElement>(
            'button[aria-label="Stage Manager"]',
        );

        expect(anna.getAttribute('aria-pressed')).toBe('true');
        expect(stageManager?.getAttribute('aria-pressed')).toBe('true');
    });

    it('renders character choices as wrapping toggle chips', async () => {
        mount();

        const anna = await waitFor(() => document.querySelector<HTMLButtonElement>(
            'button[aria-label="Anna"]',
        ));
        const stageManager = document.querySelector<HTMLButtonElement>(
            'button[aria-label="Stage Manager"]',
        );
        const group = anna.parentElement;
        const nestedOptions = group?.parentElement?.parentElement;
        const preservePagination = Array
            .from(document.querySelectorAll<HTMLLabelElement>('label'))
            .find(label => label.textContent?.trim() === 'Preserve full-script pagination');

        expect(stageManager).not.toBeNull();
        expect(group?.getAttribute('role')).toBe('toolbar');
        expect(group ? getComputedStyle(group).flexWrap : null).toBe('wrap');
        expect(anna.getAttribute('aria-pressed')).toBe('false');
        expect(group?.querySelector('input[type="checkbox"]')).toBeNull();
        expect(preservePagination).not.toBeUndefined();
        expect(
            preservePagination ? nestedOptions?.contains(preservePagination) : null,
        ).toBe(true);
        expect(
            nestedOptions ? getComputedStyle(nestedOptions).borderLeftWidth : null,
        ).toBe('1px');
        expect(
            nestedOptions
                ? Number.parseFloat(getComputedStyle(nestedOptions).paddingLeft)
                : 0,
        ).toBeGreaterThan(0);

        if (!stageManager) {
            return;
        }

        expect(stageManager.getBoundingClientRect().width).toBeGreaterThan(
            anna.getBoundingClientRect().width,
        );
        expect(Math.abs(
            stageManager.getBoundingClientRect().height - anna.getBoundingClientRect().height,
        )).toBeLessThan(1);

        await userEvent.click(anna);

        expect(anna.getAttribute('aria-pressed')).toBe('true');
        expect(getComputedStyle(anna).backgroundColor).toBe(
            getComputedStyle(document.body).color,
        );
        expect(getComputedStyle(anna).backgroundColor).not.toBe(
            getComputedStyle(stageManager).backgroundColor,
        );
    });

    it('extends the nested guide toward its parent without shifting content', async () => {
        mount();

        const anna = await waitFor(() => document.querySelector<HTMLButtonElement>(
            'button[aria-label="Anna"]',
        ));
        const nestedOptions = anna.parentElement?.parentElement?.parentElement;
        const extensionStyle = nestedOptions
            ? getComputedStyle(nestedOptions, '::before')
            : null;

        expect(nestedOptions ? getComputedStyle(nestedOptions).position : null).toBe('relative');
        expect(extensionStyle?.position).toBe('absolute');
        expect(extensionStyle ? Number.parseFloat(extensionStyle.top) : 0).toBeLessThan(0);
        expect(extensionStyle ? Number.parseFloat(extensionStyle.height) : 0).toBeGreaterThan(0);
    });
});
