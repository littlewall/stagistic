import type {ScriptDocument, ScriptSummaryMetadata} from '@stagistic/script';
import {Editor as TiptapEditor} from '@tiptap/core';
import Text from '@tiptap/extension-text';
import {createRoot, type Root} from 'react-dom/client';

import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import type {PaginationStorage} from '../tiptap/extensions/pagination/types';
import {PaginationExtension} from '../tiptap/extensions/PaginationExtension';
import {SceneCollapseExtension} from '../tiptap/extensions/sceneCollapse/SceneCollapseExtension';
import {ScriptBlockNodes} from '../tiptap/nodes';
import type {SaveResult} from './useAutosaveController';
import {useEditorAutosave} from './useEditorAutosave';

type Controller = ReturnType<typeof useEditorAutosave>;
type Save = (value: ScriptDocument, metadata?: ScriptSummaryMetadata) => SaveResult;
type SaveSummary = (value: ScriptDocument, metadata: ScriptSummaryMetadata) => SaveResult;
export type Snapshot = {value: ScriptDocument, metadata?: ScriptSummaryMetadata};

const roots: Root[] = [];
const editors: TiptapEditor[] = [];

const block = (type: string, id: string) => ({
    type,
    attrs: {id},
    content: [{type: 'text', text: id}],
});

export const shortDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [block('stageDirection', 'short')],
});

export const longDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('act', 'act'),
        block('scene', 'scene-one'),
        ...Array.from({length: 30}, (_, index) => block('stageDirection', `line-${index}`)),
        block('scene', 'scene-two'),
    ],
});

export const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor save');
};

export const paginationStorage = (editor: TiptapEditor) => {
    return (editor.storage as unknown as {Pagination: PaginationStorage}).Pagination;
};

const Fixture = ({
    editor,
    controllerRef,
    onSave,
    onValueChange,
    onSummaryMetadataChange,
}: {
    editor: TiptapEditor,
    controllerRef: {current: Controller | null},
    onSave: Save,
    onValueChange?: () => void,
    onSummaryMetadataChange?: SaveSummary,
}) => {
    controllerRef.current = useEditorAutosave(editor, {
        onAutoSave: onSave,
        onManualSave: onSave,
        autoSaveDelayMs: 20,
        onValueChange,
        onSummaryMetadataChange,
    });

    return null;
};

export const renderFixture = async (
    onSave: Save,
    onValueChange?: (editor: TiptapEditor) => void,
    onSummaryMetadataChange?: SaveSummary,
    initialValue: ScriptDocument = shortDocument(),
) => {
    const host = document.createElement('div');

    host.style.width = '300px';
    document.body.append(host);

    const editor = new TiptapEditor({
        element: host,
        extensions: [
            DocumentWithSettings,
            Text,
            SceneCollapseExtension,
            ...ScriptBlockNodes.map(node => node.configure({HTMLAttributes: {
                style: 'height:20px;line-height:20px;margin:0;padding:0',
            }})),
            PaginationExtension.configure({
                pageHeight: 100,
                pageWidth: 300,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                lineHeightPx: 20,
            }),
        ],
        content: initialValue,
    });

    editors.push(editor);

    const controllerRef: {current: Controller | null} = {current: null};
    const root = createRoot(document.createElement('div'));

    root.render(
        <Fixture
            editor={editor}
            controllerRef={controllerRef}
            onSave={onSave}
            onValueChange={() => onValueChange?.(editor)}
            onSummaryMetadataChange={onSummaryMetadataChange}
        />,
    );
    roots.push(root);
    await waitFor(() => Boolean(controllerRef.current && paginationKey.getState(editor.state)?.hasComputed));

    return {editor, controller: controllerRef.current!};
};

export const cleanupFixtures = () => {
    roots.splice(0).forEach(root => root.unmount());
    editors.splice(0).forEach(editor => {
        if (!editor.isDestroyed) {
            editor.destroy();
        }
    });
    document.body.innerHTML = '';
};
