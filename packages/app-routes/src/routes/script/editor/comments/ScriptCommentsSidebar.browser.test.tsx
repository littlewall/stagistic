import '@stagistic/ui/styles/base.css';

import type {
    ScriptCommentMessage,
    ScriptCommentsState,
    ScriptCommentThread,
    ScriptCommentThreadSnapshot,
} from '@stagistic/app-core';
import {
    getCommentsState,
    ScriptEditor,
    useEditorInstance,
} from '@stagistic/editor';
import type {
    SceneNumberFormat,
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
import {ToastProvider} from '@stagistic/ui';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {ScriptCommentsSidebar} from './ScriptCommentsSidebar';
import {useCommentsEditorBridge} from './useCommentsEditorBridge';
import {useCommentsPanelState} from './useCommentsPanelState';

type EditorInstance = NonNullable<ReturnType<typeof useEditorInstance>>;
type CommentsTestWindow = Window & {
    __commentsEditor?: EditorInstance | null,
    __comments?: ScriptCommentsState,
    __setPanelOpen?: (isOpen: boolean) => void,
};

const testWindow = window as CommentsTestWindow;

const dialogue = (id: string, text: string, threadIds: readonly string[] = []): ScriptNode => ({
    type: 'dialogue',
    attrs: {id},
    content: [
        {
            type: 'text',
            text,
            ...threadIds.length > 0 ? {marks: threadIds.map(threadId => ({type: 'commentAnchor', attrs: {threadId}}))} : {},
        },
    ],
});

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene',
    attrs: {id},
    content: [{type: 'text', text}],
});

const baseDocument = (
    blocks: ScriptNode[] = [
        scene('s1', 'INT. ROOM'),
        dialogue('b1', 'Hello world', ['t1']),
        dialogue('b2', 'Second line', ['t2']),
        dialogue('b3', 'Third line', ['t3']),
    ],
): ScriptDocument => ({type: 'doc', content: blocks});

const thread = (id: string, overrides: Partial<ScriptCommentThread> = {}): ScriptCommentThread => ({
    id,
    scriptId: 'script-1',
    anchorKind: 'range',
    anchorBlockId: null,
    quotedText: `quote ${id}`,
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'local',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

const message = (id: string, threadId: string, body: string): ScriptCommentMessage => ({
    id,
    scriptId: 'script-1',
    threadId,
    authorId: 'local',
    body,
    createdAt: 1,
    updatedAt: 1,
    editedAt: null,
});

/* In-memory stand-in for useScriptComments with the same contract. */
const useFakeComments = (initialThreads: ScriptCommentThread[], initialMessages: ScriptCommentMessage[]): ScriptCommentsState => {
    const [threads, setThreads] = useState(initialThreads);
    const [messages, setMessages] = useState(initialMessages);
    const threadsRef = useRef(threads);
    const messagesRef = useRef(messages);
    const nextId = useRef(1);

    threadsRef.current = threads;
    messagesRef.current = messages;

    return useMemo(() => {
        const allocate = (prefix: string) => `${prefix}-${nextId.current++}`;

        return {
            threads,
            messages,
            isLoading: false,
            error: null,
            allocateThreadId: () => allocate('thread'),
            createThread: input => {
                const created = thread(input.id, {
                    anchorKind: input.anchorKind,
                    anchorBlockId: input.anchorBlockId,
                    quotedText: input.quotedText,
                });

                setThreads(previous => [...previous, created]);
                setMessages(previous => [...previous, message(allocate('message'), input.id, input.body.trim())]);

                return Promise.resolve(created);
            },
            reply: (threadId, body) => {
                const created = message(allocate('message'), threadId, body.trim());

                setMessages(previous => [...previous, created]);

                return Promise.resolve(created);
            },
            editMessage: (messageId, body) => {
                setMessages(previous => previous.map(row => (row.id === messageId ? {
                    ...row,
                    body,
                    editedAt: 2,
                } : row)));

                return Promise.resolve(null);
            },
            deleteMessage: messageId => {
                setMessages(previous => previous.filter(row => row.id !== messageId));

                return Promise.resolve();
            },
            setStatus: (threadId, status) => {
                setThreads(previous => previous.map(row => (row.id === threadId ? {...row, status} : row)));

                return Promise.resolve();
            },
            deleteThread: threadId => {
                const deleted = threadsRef.current.find(row => row.id === threadId);
                const snapshot: ScriptCommentThreadSnapshot | null = deleted
                    ? {thread: deleted, messages: messagesRef.current.filter(row => row.threadId === threadId)}
                    : null;

                setThreads(previous => previous.filter(row => row.id !== threadId));
                setMessages(previous => previous.filter(row => row.threadId !== threadId));

                return Promise.resolve(snapshot);
            },
            restoreThread: snapshot => {
                setThreads(previous => [...previous, snapshot.thread]);
                setMessages(previous => [...previous, ...snapshot.messages]);

                return Promise.resolve();
            },
            moveBlockAnchors: (fromBlockId, toBlockId) => {
                setThreads(previous => previous.map(row => (row.anchorKind === 'block' && row.anchorBlockId === fromBlockId ? {...row, anchorBlockId: toBlockId} : row)));

                return Promise.resolve();
            },
        };
    }, [messages, threads]);
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        testWindow.__commentsEditor = editor;
    }, [editor]);

    return null;
};

interface HarnessProps {
    content: ScriptDocument,
    threads: ScriptCommentThread[],
    messages: ScriptCommentMessage[],
    isInitiallyOpen: boolean,
    sceneNumberFormat?: SceneNumberFormat,
    scriptScope?: string,
}

const Harness = ({
    content,
    threads,
    messages,
    isInitiallyOpen,
    sceneNumberFormat,
    scriptScope = 'script-1',
}: HarnessProps) => {
    const comments = useFakeComments(threads, messages);
    const panelState = useCommentsPanelState(scriptScope);
    const [isOpen, setIsOpen] = useState(isInitiallyOpen);
    const bridge = useCommentsEditorBridge({
        comments,
        panelState,
        revealPanel: () => setIsOpen(true),
        isPanelOpen: () => isOpen,
    });

    testWindow.__comments = comments;
    testWindow.__setPanelOpen = setIsOpen;

    return (
        <ScriptEditor
            document={{initialValue: content, commentThreads: bridge.commentThreads}}
            settings={sceneNumberFormat ? {scriptSettings: {blocks: {scene: {sceneNumberFormat}}}} : undefined}
            callbacks={bridge.callbacks}
            layout={{
                autoFocus: true,
                rightSidebarToggle: {
                    isOpen,
                    label: 'Comments',
                    onToggle: () => setIsOpen(value => !value),
                },
            }}
            editorZoom={1}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
            <ScriptEditor.RightSidebar>
                <ScriptCommentsSidebar
                    header={null}
                    comments={comments}
                    panelState={panelState}
                />
            </ScriptEditor.RightSidebar>
        </ScriptEditor>
    );
};

const roots: Root[] = [];

const poll = async <T,>(getValue: () => T | null | undefined | false, label: string): Promise<T> => {
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const mount = async ({
    content = baseDocument(),
    threads = [],
    messages = [],
    isInitiallyOpen = true,
    sceneNumberFormat,
    scriptScope,
}: Partial<HarnessProps> = {}) => {
    const host = document.createElement('div');

    host.style.width = '1400px';
    host.style.height = '800px';
    document.body.appendChild(host);

    const root = createRoot(host);

    roots.push(root);
    root.render(
        <ToastProvider>
            <Harness
                content={content}
                threads={threads}
                messages={messages}
                isInitiallyOpen={isInitiallyOpen}
                sceneNumberFormat={sceneNumberFormat}
                scriptScope={scriptScope}
            />
        </ToastProvider>,
    );

    return poll(() => testWindow.__commentsEditor, 'editor');
};

const panel = () => document.querySelector<HTMLElement>('[data-comments-panel="true"]');
const findByText = (text: string, root: ParentNode = document) => Array.from(root.querySelectorAll<HTMLElement>('p, h3, blockquote, button, span')).find(element => element.textContent?.trim() === text) ?? null;
const findButton = (label: string, root: ParentNode = document) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    button => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === label,
) ?? null;
const card = (threadId: string) => document.querySelector<HTMLElement>(`article[data-thread-id="${threadId}"]`);
const menuItem = (label: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(item => item.textContent?.replace('✓', '').trim() === label);

const chooseMenuItem = async (label: string) => {
    await page.elementLocator(await poll(() => menuItem(label), `${label} item`)).click();
};

const popoverDialog = (label: string) => document.querySelector<HTMLElement>(`[role="dialog"][aria-label^="${label}"]`);
const filterTrigger = () => Array.from((panel() ?? document).querySelectorAll<HTMLElement>('button')).find(button => button.getAttribute('aria-label')?.startsWith('Comments filter'));

const openPopover = async (label: string) => {
    if (!popoverDialog(label)) {
        const trigger = () => (label === 'Comments filter' ? filterTrigger() : findButton(label, panel() ?? document));

        await page.elementLocator(await poll(trigger, `${label} trigger`)).click();
    }

    return poll(() => popoverDialog(label), `${label} dialog`);
};

const closePopover = async (label: string) => {
    await userEvent.keyboard('{Escape}');
    await poll(() => !popoverDialog(label), `${label} dialog closed`);
};

const chooseView = async (label: string) => {
    const dialog = await openPopover('Comments settings');

    await page.elementLocator(await poll(() => findButton(label, dialog), `${label} view`)).click();
    await closePopover('Comments settings');
};

const chooseStatus = async (label: string) => {
    const dialog = await openPopover('Comments filter');

    await page.elementLocator(await poll(() => findButton('Comment status', dialog), 'status select')).click();
    await page
        .elementLocator(
            await poll(
                () => Array.from(dialog.querySelectorAll<HTMLElement>('[role="option"]')).find(option => option.textContent?.trim() === label),
                `${label} option`,
            ),
        )
        .click();
    await closePopover('Comments filter');
};

const chooseThreadAction = async (threadId: string, label: string) => {
    await page.elementLocator(await poll(() => findButton('More actions', card(threadId) ?? document), 'More actions')).click();
    await chooseMenuItem(label);
};

const threeThreads = () => ({
    threads: [
        thread('t1'),
        thread('t2'),
        thread('t3'),
    ],
    messages: [
        message('m1', 't1', 'First note'),
        message('m2', 't2', 'Second note'),
        message('m3', 't3', 'Third note'),
    ],
});

afterEach(() => {
    window.localStorage.clear();
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete testWindow.__commentsEditor;
    delete testWindow.__comments;
});

describe('ScriptCommentsSidebar', () => {
    it('shows the empty state line', async () => {
        await mount({content: baseDocument([dialogue('b1', 'Hello')])});

        expect(await poll(() => findByText('No comments. Select text and press ⌘⌥M.'), 'empty state')).toBeTruthy();
    });

    it('creates a range comment from the selection toolbar', async () => {
        const editor = await mount({content: baseDocument([dialogue('b1', 'Hello world')])});

        editor.chain().focus().setTextSelection({from: 2, to: 6})
            .run();
        await page
            .elementLocator(await poll(() => findButton('Comment', document.querySelector('[aria-label="Selection actions"]') ?? document), 'toolbar Comment'))
            .click();

        const textarea = await poll(() => panel()?.querySelector<HTMLTextAreaElement>('textarea[aria-label="Comment"]'), 'draft composer');

        expect(document.activeElement).toBe(textarea);
        await userEvent.keyboard('Tighten this');
        await userEvent.keyboard('{Meta>}{Enter}{/Meta}');

        await poll(() => document.querySelector('[data-comment-anchor]'), 'underline');
        expect(testWindow.__comments?.threads).toHaveLength(1);
        expect(await poll(() => findByText('Tighten this', panel() ?? document), 'saved body')).toBeTruthy();
    });

    it('opens the closed Comments sidebar and shows the composer when writing starts in the editor', async () => {
        const editor = await mount({content: baseDocument([dialogue('b1', 'Hello world')]), isInitiallyOpen: false});

        editor.chain().focus().setTextSelection({from: 2, to: 6})
            .run();
        await page
            .elementLocator(await poll(() => findButton('Comment', document.querySelector('[aria-label="Selection actions"]') ?? document), 'toolbar Comment'))
            .click();

        const textarea = await poll(() => panel()?.querySelector<HTMLTextAreaElement>('textarea[aria-label="Comment"]'), 'draft composer');

        expect(textarea.closest('aside')?.getAttribute('aria-hidden')).toBe('false');
        expect(document.activeElement).toBe(textarea);
    });

    it('Esc discards the draft with no writes', async () => {
        const editor = await mount({content: baseDocument([dialogue('b1', 'Hello world')])});

        editor.chain().focus().setTextSelection(3)
            .startCommentDraft()
            .run();
        await poll(() => panel()?.querySelector('textarea[aria-label="Comment"]'), 'draft composer');
        await userEvent.keyboard('{Escape}');

        await poll(() => getCommentsState(editor.state).draft === null, 'draft cleared');
        expect(testWindow.__comments?.threads).toEqual([]);
    });

    it('resolving hides the thread from Open and shows it under Resolved', async () => {
        await mount(threeThreads());

        await chooseStatus('Open');
        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await chooseThreadAction('t1', 'Resolve');
        await poll(() => !card('t1'), 't1 hidden');

        await chooseStatus('Resolved');
        expect(await poll(() => card('t1'), 't1 under Resolved')).toBeTruthy();
    });

    it('defaults to All and dots the filter trigger only when narrowed', async () => {
        await mount(threeThreads());

        const hasDot = () => Boolean(filterTrigger()?.querySelector('[data-icon-popover-indicator]'));

        await poll(() => filterTrigger(), 'filter trigger');
        expect(hasDot()).toBe(false);

        await chooseStatus('Open');
        await poll(() => hasDot(), 'dot shown');

        await chooseStatus('All');
        await poll(() => !hasDot(), 'dot hidden');
    });

    it('remembers the view for every script and the filter per script', async () => {
        const remount = async (scriptScope: string) => {
            roots.forEach(root => root.unmount());
            roots.length = 0;
            document.body.innerHTML = '';
            testWindow.__commentsEditor = null;

            return mount({...threeThreads(), scriptScope});
        };

        await mount(threeThreads());
        await chooseView('List');
        await chooseStatus('Open');

        await remount('script-1');
        await poll(() => panel()?.querySelector('section[aria-label]'), 'List view kept');
        expect(filterTrigger()?.querySelector('[data-icon-popover-indicator]')).toBeTruthy();

        await remount('script-2');
        await poll(() => panel()?.querySelector('section[aria-label]'), 'List view in another script');
        expect(filterTrigger()?.querySelector('[data-icon-popover-indicator]')).toBeNull();
    });

    it('the status filter also hides editor underlines', async () => {
        await mount(threeThreads());

        await poll(() => document.querySelector('[data-comment-anchor="t1"]'), 't1 underline');
        await chooseStatus('Resolved');
        await poll(() => !document.querySelector('[data-comment-anchor]'), 'underlines hidden');
    });

    it('reopening the active resolved thread never lights another card', async () => {
        const editor = await mount({
            threads: [
                thread('t1', {status: 'resolved'}),
                thread('t2'),
                thread('t3'),
            ],
            messages: [
                message('m1', 't1', 'First note'),
                message('m2', 't2', 'Second note'),
                message('m3', 't3', 'Third note'),
            ],
        });
        const seen: (string | null)[] = [];

        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await poll(() => getCommentsState(editor.state).activeThreadId === 't1', 't1 active');
        editor.on('transaction', ({editor: current}) => {
            const active = getCommentsState(current.state).activeThreadId;

            if (seen.at(-1) !== active) {
                seen.push(active);
            }
        });

        const lit: string[] = [];
        const observer = new MutationObserver(() => {
            document.querySelectorAll<HTMLElement>('article[data-highlighted="true"]').forEach(element => lit.push(element.dataset.threadId ?? ''));
        });

        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['data-highlighted'],
        });
        await chooseThreadAction('t1', 'Reopen');
        await poll(() => testWindow.__comments?.threads[0]?.status === 'open', 'reopened');
        await new Promise(resolve => window.setTimeout(resolve, 300));
        observer.disconnect();

        // The pointer lands on the next card when the menu closes; that must not light it.
        expect(lit.filter(threadId => threadId !== 't1')).toEqual([]);
        expect(seen.filter(threadId => threadId !== 't1')).toEqual([]);
        expect(getCommentsState(editor.state).activeThreadId).toBe('t1');
    });

    it('a margin marker activates the first card of its block, in editor order', async () => {
        // The range thread is older, but the block anchor comes first in the editor.
        const editor = await mount({
            threads: [
                thread('t1'),
                thread('tb', {
                    anchorKind: 'block',
                    anchorBlockId: 'b1',
                    createdAt: 2,
                }),
            ],
            messages: [message('m1', 't1', 'Range'), message('mb', 'tb', 'Block')],
        });

        await page.elementLocator(await poll(() => document.querySelector<HTMLElement>('[data-comment-marker-block-id="b1"]'), 'b1 marker')).click();
        await poll(() => getCommentsState(editor.state).activeThreadId === 'tb', 'tb active');

        const [blockCard, rangeCard] = await poll(() => {
            const cards = [card('tb'), card('t1')];

            return cards.every(Boolean) ? cards.map(element => element!.getBoundingClientRect()) : null;
        }, 'both cards');

        expect(blockCard.top).toBeLessThan(rangeCard.top);
    });

    it('hovering a card lights it and its underline', async () => {
        const editor = await mount(threeThreads());

        await userEvent.hover(await poll(() => card('t2'), 't2 card'));
        await poll(() => card('t2')?.dataset.highlighted === 'true', 't2 lit');
        expect(getCommentsState(editor.state).hoveredThreadId).toBe('t2');

        await userEvent.unhover(card('t2')!);
        await poll(() => getCommentsState(editor.state).hoveredThreadId === null, 'hover cleared');
    });

    it('hovering a margin marker lights every card of its block', async () => {
        await mount(threeThreads());

        const b1Marker = await poll(() => document.querySelector<HTMLElement>('[data-comment-marker-block-id="b1"]'), 'b1 marker');

        await userEvent.hover(b1Marker);
        await poll(() => card('t1')?.dataset.highlighted === 'true', 't1 lit');
        expect(card('t2')?.dataset.highlighted).toBeUndefined();

        // Only the head strip lights, not the whole card.
        const summary = card('t1')!.querySelector<HTMLElement>('button[aria-expanded="false"]')!;
        const isTinted = (element: Element) => getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)';

        expect(isTinted(summary.firstElementChild!)).toBe(true);
        expect(isTinted(summary)).toBe(false);

        await userEvent.unhover(b1Marker);
        await poll(() => card('t1')?.dataset.highlighted === undefined, 't1 unlit');
    });

    it('a group opened by activating one of its threads folds back when it is collapsed', async () => {
        const editor = await mount({
            content: baseDocument([
                scene('s1', 'INT. ROOM'),
                dialogue('b1', 'Hello world', [
                    'g1',
                    'g2',
                    'g3',
                ]),
            ]),
            threads: [
                thread('g1'),
                thread('g2'),
                thread('g3'),
            ],
            messages: [
                message('m1', 'g1', 'One'),
                message('m2', 'g2', 'Two'),
                message('m3', 'g3', 'Three'),
            ],
        });
        const group = () => findButton('3 comments', panel() ?? document);

        await page.elementLocator(await poll(() => group(), 'folded group')).click();
        await page.elementLocator(await poll(() => card('g1'), 'g1 card')).click();
        await poll(() => getCommentsState(editor.state).activeThreadId === 'g1', 'g1 active');

        await page.elementLocator(await poll(() => findButton('Collapse comment', card('g1') ?? document), 'header')).click();
        expect(await poll(() => group(), 'group folded again')).toBeTruthy();
    });

    it('clicking the tinted header collapses the active thread', async () => {
        const editor = await mount(threeThreads());

        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await poll(() => getCommentsState(editor.state).activeThreadId === 't1', 't1 active');
        await page.elementLocator(await poll(() => findButton('Collapse comment', card('t1') ?? document), 'header')).click();

        await poll(() => getCommentsState(editor.state).activeThreadId === null, 't1 collapsed');
    });

    it('List view groups by scene and lists detached threads with their quote', async () => {
        await mount({
            threads: [thread('t1'), thread('t9', {quotedText: 'gone words'})],
            messages: [message('m1', 't1', 'Anchored'), message('m9', 't9', 'Orphan')],
        });

        await chooseView('List');

        expect(await poll(() => findByText('1. INT. ROOM', panel() ?? document), 'numbered scene heading')).toBeTruthy();
        expect(await poll(() => findByText('Detached', panel() ?? document), 'Detached heading')).toBeTruthy();
        expect(findByText('gone words', panel() ?? document)).toBeTruthy();
    });

    it('List view numbers scenes in the script\'s scene number format', async () => {
        await mount({
            ...threeThreads(),
            content: baseDocument([
                scene('s1', 'INT. ROOM'),
                dialogue('b1', 'Hello world', ['t1']),
                scene('s2', 'EXT. YARD'),
                dialogue('b2', 'Second line', ['t2']),
            ]),
            sceneNumberFormat: 'paren',
        });

        await chooseView('List');

        expect(await poll(() => findByText('1) INT. ROOM', panel() ?? document), 'first scene')).toBeTruthy();
        expect(await poll(() => findByText('2) EXT. YARD', panel() ?? document), 'second scene')).toBeTruthy();
    });

    it('Beside view keeps cards in document order without overlap', async () => {
        await mount(threeThreads());

        const rects = await poll(() => {
            const cards = [
                't1',
                't2',
                't3',
            ].map(id => card(id));

            return cards.every(Boolean) ? cards.map(element => element!.getBoundingClientRect()) : null;
        }, 'three cards');

        rects.slice(1).forEach((rect, index) => {
            expect(rect.top).toBeGreaterThanOrEqual(rects[index].bottom);
        });
    });

    it('Backspace-joining a block moves its block comment to the surviving block', async () => {
        const editor = await mount({
            content: baseDocument([dialogue('b1', 'One'), dialogue('b2', 'Two')]),
            threads: [thread('tb', {anchorKind: 'block', anchorBlockId: 'b2'})],
            messages: [message('mb', 'tb', 'Block note')],
        });

        await poll(() => getCommentsState(editor.state).anchors.get('tb'), 'block anchor');
        editor.chain().focus().setTextSelection(6)
            .joinBackward()
            .run();

        await poll(() => testWindow.__comments?.threads[0]?.anchorBlockId === 'b1', 'anchor moved');
    });

    it('deleting a thread offers Undo that restores it and its anchor', async () => {
        const editor = await mount({threads: [thread('t1')], messages: [message('m1', 't1', 'Fix')]});

        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await chooseThreadAction('t1', 'Delete');

        await poll(() => !getCommentsState(editor.state).anchors.has('t1'), 'anchor removed');
        await page
            .elementLocator(
                await poll(() => findButton('Undo', document.querySelector('[aria-label="Notifications"]') ?? document.createElement('div')), 'toast Undo'),
            )
            .click();

        await poll(() => getCommentsState(editor.state).anchors.has('t1'), 'anchor restored');
        expect(await poll(() => card('t1'), 'card restored')).toBeTruthy();
    });

    it('an underline click activates the thread only while the panel is open', async () => {
        const editor = await mount({...threeThreads(), isInitiallyOpen: false});

        await page.elementLocator(await poll(() => document.querySelector<HTMLElement>('[data-comment-anchor="t2"]'), 'underline')).click();
        await new Promise(resolve => window.setTimeout(resolve, 50));
        expect(getCommentsState(editor.state).activeThreadId).toBeNull();

        testWindow.__setPanelOpen?.(true);
        await poll(() => panel(), 'panel');
        await page.elementLocator(await poll(() => document.querySelector<HTMLElement>('[data-comment-anchor="t2"]'), 'underline')).click();
        await poll(() => getCommentsState(editor.state).activeThreadId === 't2', 't2 active');
    });

    it('a detached thread in List view can be activated, resolved and deleted', async () => {
        await mount({threads: [thread('t9', {quotedText: 'gone words'})], messages: [message('m9', 't9', 'Orphan')]});

        await chooseView('List');
        await page.elementLocator(await poll(() => card('t9'), 'detached card')).click();
        await chooseThreadAction('t9', 'Resolve');
        await poll(() => testWindow.__comments?.threads[0]?.status === 'resolved', 'resolved');

        await page.elementLocator(await poll(() => card('t9'), 'detached card under All')).click();
        await chooseThreadAction('t9', 'Delete');

        await poll(() => testWindow.__comments?.threads.length === 0, 'deleted');
    });
});
