import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {deriveEditorLoadState} from './editorLoadState';

const readyDocumentArgs = {
    recentScriptsError: null,
    recentScriptsLoading: false,
    currentScriptError: null,
    currentScriptLoading: false,
    storageError: null,
    isContentLoading: false,
    editorMetadataError: null,
    sidebarDataError: null,
    isSidebarDataLoading: false,
    initialValueLoaded: true,
    scriptsLoading: false,
    scriptId: 'script-1',
} as const;

describe('deriveEditorLoadState', () => {
    it('keeps the workspace loader active while editor metadata hydrates', () => {
        const state = deriveEditorLoadState({
            ...readyDocumentArgs,
            isEditorMetadataLoading: true,
        });

        expect(state).toEqual({
            progress: 0.9,
            statusText: 'Loading editor settings',
            isLoading: true,
        });
    });

    it('keeps the workspace loader active while sidebar catalogs hydrate', () => {
        const state = deriveEditorLoadState({
            ...readyDocumentArgs,
            isEditorMetadataLoading: false,
            isSidebarDataLoading: true,
        });

        expect(state).toEqual({
            progress: 0.9,
            statusText: 'Loading characters and music',
            isLoading: true,
        });
    });

    it('finishes only after document, editor metadata, and sidebar data are ready', () => {
        const state = deriveEditorLoadState({
            ...readyDocumentArgs,
            isEditorMetadataLoading: false,
        });

        expect(state).toEqual({
            progress: 1,
            statusText: 'Preparing editor',
            isLoading: false,
        });
    });
});
