import '@stagistic/ui/styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {getConfirmedCharacterColor} from '../characters/colorResolver';
import {createMiniEditorTestDocument} from './miniEditorTestUtils';
import {MiniScriptEditor} from './MiniScriptEditor';

const mountedRoots: Root[] = [];

const renderMiniEditor = (
    size?: {width: string, height: string},
    musicNumberLabel?: string,
    scriptDocument = createMiniEditorTestDocument(),
) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    if (size) {
        host.style.width = size.width;
        host.style.height = size.height;
    }

    document.body.appendChild(host);
    root.render(
        <MiniScriptEditor
            document={scriptDocument}
            musicNumberLabel={musicNumberLabel}
        />,
    );
    mountedRoots.push(root);

    return host;
};

const waitForElement = async <TElement extends Element>(
    host: ParentNode,
    selector: string,
) => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const element = host.querySelector<TElement>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${selector}`);
};

const setCollapsedSelection = (
    node: Node,
    offset: number,
) => {
    const range = document.createRange();
    const selection = window.getSelection();

    range.setStart(node, offset);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('MiniScriptEditor', () => {
    it('renders the fixed block sequence without editor chrome', async () => {
        const host = renderMiniEditor();
        const editor = await waitForElement<HTMLElement>(
            host,
            '[data-mini-editor]',
        );
        const blockTypes = Array.from(
            editor.querySelectorAll<HTMLElement>('p[blocktype]'),
            block => block.getAttribute('blocktype'),
        );

        expect(blockTypes).toEqual([
            'scene',
            'stageDirection',
            'character',
            'aside',
            'dialogue',
        ]);
        expect(editor.querySelector('[data-editor-toolbar]')).toBeNull();
        expect(editor.querySelector('[data-editor-sidebar]')).toBeNull();
        expect(editor.querySelector('button')).toBeNull();
    });

    it('shows a non-interactive type icon for the active block', async () => {
        const host = renderMiniEditor();
        const character = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="character"]',
        );

        character.style.paddingTop = '24px';
        character.style.lineHeight = '32px';
        await userEvent.click(character);

        const indicator = await waitForElement<HTMLElement>(
            host,
            '[data-mini-block-indicator]',
        );

        expect(indicator.tagName).toBe('SPAN');
        expect(indicator.getAttribute('tabindex')).toBeNull();
        expect(indicator.querySelector('svg')).toBeTruthy();

        const editorRoot = await waitForElement<HTMLElement>(
            host,
            '[data-mini-editor]',
        );
        const currentCharacter = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="character"]',
        );
        const blockStyle = getComputedStyle(currentCharacter);
        const indicatorStyle = getComputedStyle(indicator);
        const expectedCenter = currentCharacter.getBoundingClientRect().top
            - editorRoot.getBoundingClientRect().top
            + editorRoot.scrollTop
            + Number.parseFloat(blockStyle.paddingTop)
            + Number.parseFloat(blockStyle.lineHeight) / 2;
        const indicatorCenter = Number.parseFloat(indicator.style.top);

        if (!Number.isFinite(expectedCenter) || !Number.isFinite(indicatorCenter)) {
            throw new Error(JSON.stringify({
                blockPaddingTop: blockStyle.paddingTop,
                blockLineHeight: blockStyle.lineHeight,
                indicatorTop: indicator.style.top,
            }));
        }

        expect(Math.abs(indicatorCenter - expectedCenter)).toBeLessThan(1);
        expect(indicatorStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(indicatorStyle.borderStyle).toBe('none');
    });

    it('positions the type icon at the active occurrence of a repeated block type', async () => {
        const baseDocument = createMiniEditorTestDocument();
        const host = renderMiniEditor(
            undefined,
            undefined,
            {
                ...baseDocument,
                content: [
                    ...baseDocument.content ?? [], {
                        type: 'character',
                        attrs: {
                            id: 'mini-character-second',
                            characterRefs: {
                                ELI: 'mini-character:ELI',
                            },
                        },
                        content: [{type: 'text', text: 'ELI'}],
                    },
                ],
            },
        );
        const characters = Array.from(
            (await waitForElement<HTMLElement>(
                host,
                '[data-mini-editor]',
            )).querySelectorAll<HTMLElement>('p[blocktype="character"]'),
        );

        expect(characters).toHaveLength(2);

        const secondCharacter = characters[1];

        if (!secondCharacter) {
            throw new Error('Expected second character block.');
        }

        await userEvent.click(secondCharacter);

        const indicator = await waitForElement<HTMLElement>(
            host,
            '[data-mini-block-indicator]',
        );
        const editorRoot = await waitForElement<HTMLElement>(
            host,
            '[data-mini-editor]',
        );
        const secondStyle = getComputedStyle(secondCharacter);
        const expectedCenter = secondCharacter.getBoundingClientRect().top
            - editorRoot.getBoundingClientRect().top
            + editorRoot.scrollTop
            + Number.parseFloat(secondStyle.paddingTop)
            + Number.parseFloat(secondStyle.lineHeight) / 2;
        const indicatorCenter = Number.parseFloat(indicator.style.top);

        expect(Math.abs(indicatorCenter - expectedCenter)).toBeLessThan(1);
    });

    it('uses real default script geometry and saturated character decorations', async () => {
        const host = renderMiniEditor();
        const editorRoot = await waitForElement<HTMLElement>(
            host,
            '[data-mini-editor]',
        );
        const character = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="character"]',
        );
        const mara = await waitForElement<HTMLElement>(
            character,
            '[data-character-key="MARA"]',
        );

        expect(getComputedStyle(editorRoot).fontSize).toBe('16px');
        expect(getComputedStyle(editorRoot).lineHeight).toBe('19.2px');
        expect(
            getComputedStyle(editorRoot).getPropertyValue('--character-indent-left').trim(),
        ).toBe('16ch');
        expect(
            getComputedStyle(editorRoot).getPropertyValue('--aside-indent-left').trim(),
        ).toBe('12ch');
        expect(
            getComputedStyle(editorRoot).getPropertyValue('--dialogue-indent-left').trim(),
        ).toBe('6ch');
        expect(
            getComputedStyle(mara).getPropertyValue('--character-tag-color').trim(),
        ).toBe(getConfirmedCharacterColor('mini-character:MARA', null, 60));
    });

    it('keeps the music title editable without activating a menu', async () => {
        const host = renderMiniEditor();
        const musicTitle = await waitForElement<HTMLElement>(
            host,
            '[data-music-title-input="start"]',
        );

        await userEvent.click(musicTitle);
        expect(document.activeElement).toBe(musicTitle);

        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(musicTitle);
        selection?.removeAllRanges();
        selection?.addRange(range);
        await userEvent.keyboard('New title');

        expect(musicTitle.textContent).toBe('New title');
        expect(host.querySelector('[data-music-menu="start"]')).toBeNull();
    });

    it('can preserve the music number from the full-script excerpt', async () => {
        const host = renderMiniEditor(undefined, '2)');
        const musicNumber = await waitForElement<HTMLElement>(
            host,
            '[data-music-number]',
        );

        expect(musicNumber.textContent).toBe('2)');
    });

    it('moves a click after the trailing music pill before it', async () => {
        const host = renderMiniEditor();
        const pill = await waitForElement<HTMLElement>(
            host,
            '[data-music-pill="start"]',
        );
        const block = pill.closest<HTMLElement>('p[blocktype="stageDirection"]');

        if (!block) {
            throw new Error('Expected music stage direction.');
        }

        const blockRect = block.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();

        await page.elementLocator(block).click({
            position: {
                x: Math.min(
                    blockRect.width - 2,
                    pillRect.right - blockRect.left + 4,
                ),
                y: pillRect.top - blockRect.top + pillRect.height / 2,
            },
        });
        await userEvent.keyboard('X');

        const currentPill = await waitForElement<HTMLElement>(
            host,
            '[data-music-pill="start"]',
        );
        const currentBlock = currentPill.closest<HTMLElement>('p[blocktype]');
        let pillWrapper: HTMLElement = currentPill;

        while (
            currentBlock
            && pillWrapper.parentElement
            && pillWrapper.parentElement !== currentBlock
        ) {
            pillWrapper = pillWrapper.parentElement;
        }

        expect(pillWrapper.previousSibling?.textContent?.endsWith('X')).toBe(true);
        expect(pillWrapper.nextSibling?.textContent?.includes('X') ?? false).toBe(false);
    });

    it('suggests names written into the character block for stage directions', async () => {
        const host = renderMiniEditor();
        const character = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="character"]',
        );

        await userEvent.click(character);

        const characterRange = document.createRange();
        const characterSelection = window.getSelection();

        characterRange.selectNodeContents(character);
        characterSelection?.removeAllRanges();
        characterSelection?.addRange(characterRange);
        await userEvent.keyboard('ANNA / BORIS');

        const stageDirection = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="stageDirection"]',
        );

        await userEvent.click(stageDirection);

        const stageText = stageDirection.firstChild;

        if (!stageText) {
            throw new Error('Expected stage direction text.');
        }

        const stageRange = document.createRange();
        const stageSelection = window.getSelection();

        stageRange.setStart(stageText, stageText.textContent?.length ?? 0);
        stageRange.collapse(true);
        stageSelection?.removeAllRanges();
        stageSelection?.addRange(stageRange);
        await userEvent.keyboard('@bo');

        const option = await waitForElement<HTMLElement>(
            host,
            '[role="option"]',
        );

        expect(option.textContent?.trim()).toBe('BORIS');
        await page.elementLocator(option).click();

        expect(
            stageDirection.querySelector('[data-character-key="BORIS"]'),
        ).toBeTruthy();
    });

    it('keeps the in-memory cast available while editing a character cue', async () => {
        const host = renderMiniEditor();
        const character = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="character"]',
        );

        await userEvent.click(character);

        const characterRange = document.createRange();
        const characterSelection = window.getSelection();

        characterRange.selectNodeContents(character);
        characterSelection?.removeAllRanges();
        characterSelection?.addRange(characterRange);
        await userEvent.keyboard('m');
        await new Promise(resolve => window.setTimeout(resolve, 20));
        await userEvent.keyboard('a');

        const option = await waitForElement<HTMLElement>(
            host,
            '[role="option"]',
        );

        expect(option.textContent?.trim()).toBe('MARA');
    });

    it('moves forward with Enter and stops Backspace at the block boundary', async () => {
        const host = renderMiniEditor();
        const scene = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="scene"]',
        );
        const stageDirection = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="stageDirection"]',
        );
        const originalSceneText = scene.textContent;

        await userEvent.click(scene);

        const sceneText = scene.firstChild;

        if (!sceneText) {
            throw new Error('Expected scene text.');
        }

        setCollapsedSelection(sceneText, sceneText.textContent?.length ?? 0);
        await userEvent.keyboard('{Enter}');

        const selectionAfterEnter = window.getSelection();

        expect(
            stageDirection.contains(selectionAfterEnter?.anchorNode ?? null),
        ).toBe(true);

        setCollapsedSelection(stageDirection, 0);
        await userEvent.keyboard('{Backspace}');

        expect(scene.textContent).toBe(originalSceneText);
        expect(host.querySelectorAll('p[blocktype]')).toHaveLength(5);
    });

    it('keeps long content scrollable inside the mini editor', async () => {
        const host = renderMiniEditor({
            width: '320px',
            height: '120px',
        });
        const editor = await waitForElement<HTMLElement>(
            host,
            '[data-mini-editor]',
        );

        expect(editor.clientHeight).toBe(120);
        expect(editor.scrollHeight).toBeGreaterThan(editor.clientHeight);
        expect(getComputedStyle(editor).overflowY).toBe('auto');
    });

    it('keeps the aside text on one line in the narrow landing preview', async () => {
        const host = renderMiniEditor({
            width: '480px',
            height: '500px',
        });
        const aside = await waitForElement<HTMLElement>(
            host,
            'p[blocktype="aside"]',
        );
        const range = document.createRange();

        range.selectNodeContents(aside);

        expect(range.getClientRects()).toHaveLength(1);
    });
});
