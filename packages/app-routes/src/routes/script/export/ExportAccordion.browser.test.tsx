import '@stagistic/ui/styles/base.css';

import type {ScriptData} from '@stagistic/export';
import {
    createDefaultScriptDocument,
    DEFAULT_EDITOR_SETTINGS,
    type ScriptDocument,
} from '@stagistic/script';
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

import {ExportControlPanel} from './ExportControlPanel';
import {ExportProvider} from './ExportProvider';

const roots: Root[] = [];

const toScriptData = (doc: ScriptDocument): ScriptData => ({
    doc,
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    scriptTitle: 'Draft',
    titlePage: null,
});

const mountExportControlPanel = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ExportProvider
            script={toScriptData(createDefaultScriptDocument('scene-1'))}
            settings={DEFAULT_EDITOR_SETTINGS}
        >
            <ExportControlPanel />
        </ExportProvider>,
    );
    roots.push(root);
};

const waitFor = async <Value, >(getValue: () => Value | null | undefined): Promise<Value> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for export controls.');
};

const findButton = (label: string) => Array
    .from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => button.textContent?.trim() === label) ?? null;

const findSwitch = (label: string) => Array
    .from(document.querySelectorAll<HTMLLabelElement>('label'))
    .find(element => element.textContent?.trim() === label) ?? null;

const findSectionRegion = (trigger: HTMLButtonElement) => {
    const regionId = trigger.getAttribute('aria-controls');

    return regionId ? document.getElementById(regionId) : null;
};

const findDisclosure = (trigger: HTMLButtonElement) => trigger.closest('h2')?.parentElement ?? null;

const centerY = (element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();

    return bounds.y + bounds.height / 2;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('Export accordion', () => {
    it('composes template selection as a peer section with standard interface typography', async () => {
        mountExportControlPanel();

        await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));

        const templateTrigger = findButton('Template');
        const contentTrigger = findButton('Content');

        expect(templateTrigger).not.toBeNull();
        expect(contentTrigger).not.toBeNull();

        if (!templateTrigger || !contentTrigger) {
            return;
        }

        const templateSection = findDisclosure(templateTrigger);
        const contentSection = findDisclosure(contentTrigger);

        expect(templateSection?.parentElement).toBe(contentSection?.parentElement);

        await userEvent.click(templateTrigger);

        const templateSelect = await waitFor(() => templateSection?.querySelector<HTMLButtonElement>(
            'button[aria-label="Export template"]',
        ));
        const interfaceFont = getComputedStyle(contentTrigger).fontFamily;

        expect(getComputedStyle(templateTrigger).fontFamily).toBe(interfaceFont);
        expect(getComputedStyle(templateSelect).fontFamily).toBe(interfaceFont);
    });

    it('shows a visible boundary around every export select', async () => {
        mountExportControlPanel();

        await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));

        const templateTrigger = findButton('Template');
        const openingPagesTrigger = findButton('Opening pages');

        expect(templateTrigger).not.toBeNull();
        expect(openingPagesTrigger).not.toBeNull();

        if (!templateTrigger || !openingPagesTrigger) {
            return;
        }

        await userEvent.click(templateTrigger);
        await userEvent.click(openingPagesTrigger);

        const selects = await waitFor(() => {
            const elements = Array.from(document.querySelectorAll<HTMLButtonElement>(
                'button[aria-haspopup="listbox"]',
            ));

            return elements.length === 3 ? elements : null;
        });

        expect(selects.map(select => select.getAttribute('aria-label'))).toEqual([
            'Export template',
            'Blank page count',
            'Order characters by',
        ]);

        for (const select of selects) {
            const style = getComputedStyle(select);

            expect(style.borderTopWidth).toBe('1px');
            expect(style.borderTopStyle).toBe('solid');
            expect(style.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
        }
    });

    it('uses four full-width disclosure sections without collapsed spacing or reset controls', async () => {
        mountExportControlPanel();

        const pageHeading = await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));
        const panel = pageHeading.parentElement?.parentElement;
        const templateTrigger = findButton('Template');
        const contentTrigger = findButton('Content');
        const openingPagesTrigger = findButton('Opening pages');
        const pageFlowTrigger = findButton('Page flow');

        expect(templateTrigger).not.toBeNull();
        expect(contentTrigger).not.toBeNull();
        expect(openingPagesTrigger).not.toBeNull();
        expect(pageFlowTrigger).not.toBeNull();

        if (!panel || !templateTrigger || !contentTrigger || !openingPagesTrigger || !pageFlowTrigger) {
            return;
        }

        expect(templateTrigger.getAttribute('aria-expanded')).toBe('false');
        expect(contentTrigger.getAttribute('aria-expanded')).toBe('false');
        expect(openingPagesTrigger.getAttribute('aria-expanded')).toBe('false');
        expect(pageFlowTrigger.getAttribute('aria-expanded')).toBe('false');
        for (const trigger of [
            templateTrigger,
            contentTrigger,
            openingPagesTrigger,
            pageFlowTrigger,
        ]) {
            const collapsedRegion = findSectionRegion(trigger);

            expect(collapsedRegion).not.toBeNull();

            if (!collapsedRegion) {
                continue;
            }

            const collapsedStyle = getComputedStyle(collapsedRegion);

            expect(collapsedRegion.getBoundingClientRect().height).toBe(0);
            expect(Number.parseFloat(collapsedStyle.paddingTop)).toBe(0);
            expect(Number.parseFloat(collapsedStyle.paddingBottom)).toBe(0);
        }

        expect(findButton('Reset section')).toBeNull();

        await userEvent.click(openingPagesTrigger);

        const regionId = openingPagesTrigger.getAttribute('aria-controls');
        const region = regionId
            ? await waitFor(() => document.getElementById(regionId))
            : null;

        expect(openingPagesTrigger.getAttribute('aria-expanded')).toBe('true');
        expect(openingPagesTrigger.textContent?.trim()).toBe('Opening pages');
        expect(region?.getAttribute('role')).toBe('region');

        if (!region) {
            return;
        }

        const panelWidth = panel.getBoundingClientRect().width;
        const triggerWidth = openingPagesTrigger.getBoundingClientRect().width;
        const regionWidth = region.getBoundingClientRect().width;
        const triggerPadding = Number.parseFloat(getComputedStyle(openingPagesTrigger).paddingLeft);
        const regionPadding = Number.parseFloat(getComputedStyle(region).paddingLeft);

        expect(Math.abs(panelWidth - triggerWidth)).toBeLessThan(1);
        expect(Math.abs(panelWidth - regionWidth)).toBeLessThan(1);
        expect(openingPagesTrigger.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
        expect(triggerPadding).toBeGreaterThan(0);
        expect(Math.abs(triggerPadding - regionPadding)).toBeLessThan(1);
    });

    it('aligns every visible switch to the right edge of its section content', async () => {
        mountExportControlPanel();

        await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));

        const triggers = [
            findButton('Content'),
            findButton('Opening pages'),
            findButton('Page flow'),
        ];

        expect(triggers.every(Boolean)).toBe(true);

        for (const trigger of triggers) {
            if (trigger) {
                await userEvent.click(trigger);
            }
        }

        const selectedCharactersSwitch = await waitFor(() => findSwitch('Selected characters only'));

        await userEvent.click(selectedCharactersSwitch);
        await waitFor(() => findSwitch('Preserve full-script pagination'));

        for (const trigger of triggers) {
            if (!trigger) {
                continue;
            }

            const region = findSectionRegion(trigger);

            expect(region).not.toBeNull();

            if (!region) {
                continue;
            }

            const regionStyle = getComputedStyle(region);
            const contentRight = region.getBoundingClientRect().right
                - Number.parseFloat(regionStyle.paddingRight);
            const switchTracks = Array
                .from(region.querySelectorAll<HTMLInputElement>('input[role="switch"]'))
                .map(input => input.closest('label')?.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]'));

            expect(switchTracks.length).toBeGreaterThan(0);

            for (const track of switchTracks) {
                expect(track).not.toBeNull();

                if (track) {
                    expect(Math.abs(track.getBoundingClientRect().right - contentRight)).toBeLessThan(1);
                }
            }
        }
    });

    it('uses the same vertical rhythm for switch rows in every section', async () => {
        mountExportControlPanel();

        await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));

        const triggers = [
            findButton('Content'),
            findButton('Opening pages'),
            findButton('Page flow'),
        ];

        expect(triggers.every(Boolean)).toBe(true);

        for (const trigger of triggers) {
            if (trigger) {
                await userEvent.click(trigger);
            }
        }

        const selectedCharacters = await waitFor(() => findSwitch('Selected characters only'));
        const showNotes = await waitFor(() => findSwitch('Show notes'));
        const oddInitialPages = await waitFor(() => findSwitch('Start each initial page on an odd page'));
        const showPageNumbers = await waitFor(() => findSwitch('Show page numbers'));
        const scenesOnNewPage = await waitFor(() => findSwitch('Scenes start on a new page'));
        const scenesOnOddPages = await waitFor(() => findSwitch('Scenes start on odd pages'));
        const expectedRowStep = centerY(showPageNumbers) - centerY(oddInitialPages);

        expect(Math.abs(centerY(showNotes) - centerY(selectedCharacters) - expectedRowStep)).toBeLessThan(1);
        expect(Math.abs(centerY(scenesOnOddPages) - centerY(scenesOnNewPage) - expectedRowStep)).toBeLessThan(1);
    });

    it('groups opening-page controls and gives peer groups the same hierarchy', async () => {
        mountExportControlPanel();

        await waitFor(() => document.querySelector<HTMLHeadingElement>('h1'));

        const openingPagesTrigger = findButton('Opening pages');
        const pageFlowTrigger = findButton('Page flow');

        expect(openingPagesTrigger).not.toBeNull();
        expect(pageFlowTrigger).not.toBeNull();

        if (!openingPagesTrigger || !pageFlowTrigger) {
            return;
        }

        await userEvent.click(openingPagesTrigger);
        await userEvent.click(pageFlowTrigger);

        const openingPagesRegion = findSectionRegion(openingPagesTrigger);
        const pageFlowRegion = findSectionRegion(pageFlowTrigger);

        expect(openingPagesRegion).not.toBeNull();
        expect(pageFlowRegion).not.toBeNull();

        if (!openingPagesRegion || !pageFlowRegion) {
            return;
        }

        const blankPageSelect = openingPagesRegion.querySelector<HTMLButtonElement>('button[aria-label="Blank page count"]');
        const blankPageLabel = openingPagesRegion.querySelector<HTMLLabelElement>('label[for="blank-page-count"]');
        const numberingSwitch = Array
            .from(openingPagesRegion.querySelectorAll<HTMLLabelElement>('label'))
            .find(label => label.textContent?.trim() === 'Show page numbers');
        const charactersSwitch = Array
            .from(openingPagesRegion.querySelectorAll<HTMLLabelElement>('label'))
            .find(label => label.textContent?.trim() === 'Characters');
        const charactersTitle = Array
            .from(openingPagesRegion.querySelectorAll<HTMLSpanElement>('span'))
            .find(span => span.textContent?.trim() === 'Characters' && span.children.length === 0);
        const pageBreaksHeading = Array
            .from(pageFlowRegion.querySelectorAll<HTMLHeadingElement>('h3'))
            .find(heading => heading.textContent?.trim() === 'Page breaks');
        const openingHeadings = Array
            .from(openingPagesRegion.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(heading => heading.textContent?.trim());

        expect(blankPageSelect).not.toBeNull();
        expect(blankPageLabel?.textContent?.trim()).toBe('Blank pages');
        expect(pageFlowRegion.querySelector('button[aria-label="Blank page count"]')).toBeNull();
        expect(openingHeadings).not.toContain('Blank pages');
        expect(numberingSwitch).not.toBeUndefined();
        expect(charactersSwitch).not.toBeUndefined();
        expect(charactersTitle).not.toBeUndefined();
        expect(pageBreaksHeading).not.toBeUndefined();

        if (
            !blankPageSelect
            || !numberingSwitch
            || !charactersSwitch
            || !charactersTitle
            || !pageBreaksHeading
        ) {
            return;
        }

        expect(numberingSwitch.compareDocumentPosition(blankPageSelect) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        expect(blankPageSelect.compareDocumentPosition(charactersSwitch) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        expect(getComputedStyle(pageBreaksHeading).fontSize).toBe(getComputedStyle(charactersTitle).fontSize);
        expect(getComputedStyle(pageBreaksHeading).fontWeight).toBe(getComputedStyle(charactersTitle).fontWeight);
    });
});
