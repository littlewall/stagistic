import '@stagistic/ui/styles/base.css';

import type {ScriptCommentMessage, ScriptCommentsState, ScriptCommentThread, ScriptCommentThreadSnapshot} from '@stagistic/app-core';
import {getCommentsState, ScriptEditor, useEditorInstance} from '@stagistic/editor';
import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {ToastProvider} from '@stagistic/ui';
import {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {ScriptCommentsSidebar} from './ScriptCommentsSidebar';
import {useCommentsEditorBridge} from './useCommentsEditorBridge';
import {useCommentsPanelState} from './useCommentsPanelState';

type EditorInstance = NonNullable<ReturnType<typeof useEditorInstance>>;
type CommentsTestWindow = Window & {
    __commentsEditor?: EditorInstance | null;
    __comments?: ScriptCommentsState;
    __setPanelOpen?: (isOpen: boolean) => void;
};

const testWindow = window as CommentsTestWindow;

const dialogue = (id: string, text: string, threadIds: readonly string[] = []): ScriptNode => ({
    type: 'dialogue',
    attrs: {id},
    content: [
        {
            type: 'text',
            text,
            ...(threadIds.length > 0 ? {marks: threadIds.map(threadId => ({type: 'commentAnchor', attrs: {threadId}}))} : {}),
        },
    ],
});

const scene = (id: string, text: string): ScriptNode => ({type: 'scene', attrs: {id}, content: [{type: 'text', text}]});

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
                const created = thread(input.id, {anchorKind: input.anchorKind, anchorBlockId: input.anchorBlockId, quotedText: input.quotedText});

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
                setMessages(previous => previous.map(row => (row.id === messageId ? {...row, body, editedAt: 2} : row)));

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
                setThreads(previous =>
                    previous.map(row => (row.anchorKind === 'block' && row.anchorBlockId === fromBlockId ? {...row, anchorBlockId: toBlockId} : row)),
                );

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
    content: ScriptDocument;
    threads: ScriptCommentThread[];
    messages: ScriptCommentMessage[];
    isInitiallyOpen: boolean;
}

const Harness = ({content, threads, messages, isInitiallyOpen}: HarnessProps) => {
    const comments = useFakeComments(threads, messages);
    const panelState = useCommentsPanelState();
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
            callbacks={bridge.callbacks}
            layout={{
                autoFocus: true,
                rightSidebarToggle: {isOpen, label: 'Comments', onToggle: () => setIsOpen(value => !value)},
            }}
            editorZoom={1}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
            <ScriptEditor.RightSidebar>
                <ScriptCommentsSidebar header={null} comments={comments} panelState={panelState} />
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

const mount = async ({content = baseDocument(), threads = [], messages = [], isInitiallyOpen = true}: Partial<HarnessProps> = {}) => {
    const host = document.createElement('div');

    host.style.width = '1400px';
    host.style.height = '800px';
    document.body.appendChild(host);

    const root = createRoot(host);

    roots.push(root);
    root.render(
        <ToastProvider>
            <Harness content={content} threads={threads} messages={messages} isInitiallyOpen={isInitiallyOpen} />
        </ToastProvider>,
    );

    return poll(() => testWindow.__commentsEditor, 'editor');
};

const panel = () => document.querySelector<HTMLElement>('[data-comments-panel="true"]');
const findByText = (text: string, root: ParentNode = document) =>
    Array.from(root.querySelectorAll<HTMLElement>('p, h3, blockquote, button, span')).find(element => element.textContent?.trim() === text) ?? null;
const findButton = (label: string, root: ParentNode = document) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
        button => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === label,
    ) ?? null;
const card = (threadId: string) => document.querySelector<HTMLElement>(`article[data-thread-id="${threadId}"]`);

const threeThreads = () => ({
    threads: [thread('t1'), thread('t2'), thread('t3')],
    messages: [message('m1', 't1', 'First note'), message('m2', 't2', 'Second note'), message('m3', 't3', 'Third note')],
});

afterEach(() => {
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

        editor.chain().focus().setTextSelection({from: 2, to: 6}).run();
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

    it('Esc discards the draft with no writes', async () => {
        const editor = await mount({content: baseDocument([dialogue('b1', 'Hello world')])});

        editor.chain().focus().setTextSelection(3).startCommentDraft().run();
        await poll(() => panel()?.querySelector('textarea[aria-label="Comment"]'), 'draft composer');
        await userEvent.keyboard('{Escape}');

        await poll(() => getCommentsState(editor.state).draft === null, 'draft cleared');
        expect(testWindow.__comments?.threads).toEqual([]);
    });

    it('resolving hides the thread from Open and shows it under Resolved', async () => {
        await mount(threeThreads());

        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await page.elementLocator(await poll(() => findButton('Resolve', card('t1') ?? document), 'Resolve')).click();
        await poll(() => !card('t1'), 't1 hidden');

        await page.elementLocator(await poll(() => findButton('Resolved', panel() ?? document), 'Resolved filter')).click();
        expect(await poll(() => card('t1'), 't1 under Resolved')).toBeTruthy();
    });

    it('List view groups by scene and lists detached threads with their quote', async () => {
        await mount({
            threads: [thread('t1'), thread('t9', {quotedText: 'gone words'})],
            messages: [message('m1', 't1', 'Anchored'), message('m9', 't9', 'Orphan')],
        });

        await page.elementLocator(await poll(() => findButton('List', panel() ?? document), 'List toggle')).click();

        expect(await poll(() => findByText('INT. ROOM', panel() ?? document), 'scene heading')).toBeTruthy();
        expect(await poll(() => findByText('Detached', panel() ?? document), 'Detached heading')).toBeTruthy();
        expect(findByText('gone words', panel() ?? document)).toBeTruthy();
    });

    it('Beside view keeps cards in document order without overlap', async () => {
        await mount(threeThreads());

        const rects = await poll(() => {
            const cards = ['t1', 't2', 't3'].map(id => card(id));

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
        editor.chain().focus().setTextSelection(6).joinBackward().run();

        await poll(() => testWindow.__comments?.threads[0]?.anchorBlockId === 'b1', 'anchor moved');
    });

    it('deleting a thread offers Undo that restores it and its anchor', async () => {
        const editor = await mount({threads: [thread('t1')], messages: [message('m1', 't1', 'Fix')]});

        await page.elementLocator(await poll(() => card('t1'), 't1 card')).click();
        await page.elementLocator(await poll(() => findButton('More actions', card('t1') ?? document), 'More actions')).click();
        await page
            .elementLocator(
                await poll(
                    () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(item => item.textContent?.trim() === 'Delete'),
                    'Delete item',
                ),
            )
            .click();

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

        await page.elementLocator(await poll(() => findButton('List', panel() ?? document), 'List toggle')).click();
        await page.elementLocator(await poll(() => card('t9'), 'detached card')).click();
        await page.elementLocator(await poll(() => findButton('Resolve', card('t9') ?? document), 'Resolve on detached')).click();
        await poll(() => testWindow.__comments?.threads[0]?.status === 'resolved', 'resolved');

        await page.elementLocator(await poll(() => findButton('All', panel() ?? document), 'All filter')).click();
        await page.elementLocator(await poll(() => card('t9'), 'detached card under All')).click();
        await page.elementLocator(await poll(() => findButton('More actions', card('t9') ?? document), 'More actions')).click();
        await page
            .elementLocator(
                await poll(
                    () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(item => item.textContent?.trim() === 'Delete'),
                    'Delete item',
                ),
            )
            .click();

        await poll(() => testWindow.__comments?.threads.length === 0, 'deleted');
    });
});
