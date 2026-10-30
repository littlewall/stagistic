import type {SceneNumberFormat} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';
import type {ReactNode, RefObject} from 'react';

import {type EditorActCommands, EditorActCommandsProvider} from './actCommands/context';
import {EditorInstanceProvider} from './context';
import {EditorElementSelectionProvider} from './elementSelection/context';
import {EditorSnapshotStoreProvider} from './live/context';
import type {EditorSnapshotStore} from './live/store';
import {EditorSceneNumberFormatContext} from './sceneNumberFormatContext';

export const EditorProviders = ({
    editor,
    rootRef,
    liveStore,
    sceneNumberFormat,
    actCommands,
    children,
}: {
    editor: TiptapEditor,
    rootRef: RefObject<HTMLDivElement | null>,
    liveStore: EditorSnapshotStore,
    sceneNumberFormat: SceneNumberFormat,
    actCommands: EditorActCommands,
    children: ReactNode,
}) => (
    <EditorSnapshotStoreProvider store={liveStore}>
        <EditorInstanceProvider editor={editor}>
            <EditorElementSelectionProvider editor={editor} rootRef={rootRef}>
                <EditorSceneNumberFormatContext.Provider value={sceneNumberFormat}>
                    <EditorActCommandsProvider value={actCommands}>{children}</EditorActCommandsProvider>
                </EditorSceneNumberFormatContext.Provider>
            </EditorElementSelectionProvider>
        </EditorInstanceProvider>
    </EditorSnapshotStoreProvider>
);
