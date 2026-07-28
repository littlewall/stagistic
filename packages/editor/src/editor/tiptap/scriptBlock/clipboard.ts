import {
    MUSIC_ID_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import {
    Fragment,
    type Node as ProseMirrorNode,
    Slice,
} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';

import {getMusicNumberLabelsById} from '../extensions/musicNumbering/plugin';
import {SCRIPT_BLOCK_DOM_SELECTOR} from '../scriptCore';

const MUSIC_START_SELECTOR = '[data-music-pill="start"]';
const MUSIC_OUT_SELECTOR = '[data-music-pill="out"]';

const rangeIntersectsNode = (range: Range, node: Node) => {
    try {
        return range.intersectsNode(node);
    } catch {
        return false;
    }
};

const readVisibleMusicLabel = (pill: Element) => {
    const number = pill.querySelector('[data-music-number]')?.textContent?.trim() ?? '';
    const title = pill.querySelector('[data-music-title-input="start"]')?.textContent?.trim() ?? '';

    return [number, title].filter(Boolean).join(' ');
};

const resolveCopiedNodeViewTarget = (element: Element): Element => {
    const parent = element.parentElement;

    if (parent?.getAttribute('contenteditable') === 'false' && parent.childNodes.length === 1) {
        return parent;
    }

    return element;
};

const collectTextNodes = (root: Node) => {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        nodes.push(walker.currentNode as Text);
    }

    return nodes;
};

const applyVisibleCasing = (text: string, source: Text) => {
    const parent = source.parentElement;

    if (!parent) {
        return text;
    }

    const transform = getComputedStyle(parent).textTransform;

    if (transform === 'uppercase') {
        return text.toLocaleUpperCase();
    }

    if (transform === 'lowercase') {
        return text.toLocaleLowerCase();
    }

    return text;
};

const normalizeCopiedTextCasing = (
    sourceRoot: HTMLElement,
    range: Range,
    copiedRoot: HTMLElement,
) => {
    const sourceNodes = collectTextNodes(sourceRoot)
        .filter(node => rangeIntersectsNode(range, node));
    const copiedNodes = collectTextNodes(copiedRoot);

    copiedNodes.forEach((node, index) => {
        const source = sourceNodes[index];

        if (source) {
            node.textContent = applyVisibleCasing(node.textContent ?? '', source);
        }
    });
};

const selectionBelongsToEditor = (view: EditorView, range: Range) => {
    const commonAncestor = range.commonAncestorContainer;

    return commonAncestor === view.dom || view.dom.contains(commonAncestor);
};

const readCopiedPlainText = (container: HTMLElement) => {
    const blocks = [...container.querySelectorAll<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR)];

    if (blocks.length < 2) {
        return container.textContent ?? '';
    }

    return blocks.map(block => block.textContent ?? '').join('\n');
};

export const copyVisibleScriptSelection = (
    view: EditorView,
    event: ClipboardEvent,
): boolean => {
    const clipboardData = event.clipboardData;
    const selection = window.getSelection();

    if (!clipboardData || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        return false;
    }

    const range = selection.getRangeAt(0);

    if (!selectionBelongsToEditor(view, range)) {
        return false;
    }

    const selectedMusic = [...view.dom.querySelectorAll(MUSIC_START_SELECTOR)]
        .filter(pill => rangeIntersectsNode(range, pill));

    const container = document.createElement('div');

    container.appendChild(range.cloneContents());
    normalizeCopiedTextCasing(view.dom, range, container);
    container.querySelectorAll(MUSIC_OUT_SELECTOR).forEach(out => {
        resolveCopiedNodeViewTarget(out).remove();
    });
    container.querySelectorAll(MUSIC_START_SELECTOR).forEach((pill, index) => {
        const copiedNodeView = resolveCopiedNodeViewTarget(pill);
        const sourcePill = selectedMusic.find(source => {
            return source.getAttribute('data-music-id') === pill.getAttribute('data-music-id');
        }) ?? selectedMusic[index];
        const label = sourcePill ? readVisibleMusicLabel(sourcePill) : '';

        if (!label) {
            copiedNodeView.remove();

            return;
        }

        const text = document.createElement('strong');

        text.textContent = ` ${label} `;
        copiedNodeView.replaceWith(text);
    });

    event.preventDefault();
    clipboardData.clearData();
    clipboardData.setData('text/html', container.innerHTML);
    clipboardData.setData('text/plain', readCopiedPlainText(container));

    return true;
};

const transformFragment = (
    fragment: Fragment,
    state: EditorState,
    labels: ReadonlyMap<string, string>,
): Fragment => {
    const nodes: ProseMirrorNode[] = [];

    fragment.forEach(node => {
        if (node.type.name === MUSIC_OUT_NODE_NAME) {
            return;
        }

        if (node.type.name === MUSIC_START_NODE_NAME) {
            const musicId = String(node.attrs[MUSIC_ID_ATTR] ?? '');
            const number = labels.get(musicId) ?? '';
            const title = String(node.attrs[MUSIC_TITLE_ATTR] ?? '').trim();
            const text = [number, title].filter(Boolean).join(' ');

            if (!text) {
                return;
            }

            const bold = state.schema.marks.bold?.create();

            nodes.push(state.schema.text(` ${text} `, bold ? [bold] : []));

            return;
        }

        if (node.isLeaf) {
            nodes.push(node);

            return;
        }

        nodes.push(node.copy(transformFragment(node.content, state, labels)));
    });

    return Fragment.fromArray(nodes);
};

export const transformCopiedScriptSlice = (
    slice: Slice,
    state: EditorState,
): Slice => {
    return new Slice(
        transformFragment(slice.content, state, getMusicNumberLabelsById(state)),
        slice.openStart,
        slice.openEnd,
    );
};
