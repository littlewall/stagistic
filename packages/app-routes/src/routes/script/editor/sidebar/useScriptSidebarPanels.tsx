import {type useScriptComments} from '@stagistic/app-core';
import {useMemo} from 'react';

import {ScriptCharactersSidebar} from '../characters/ScriptCharactersSidebar';
import {type CommentsPanelState, ScriptCommentsSidebar} from '../comments';
import {ScriptMusicSidebar, type useScriptMusicState} from '../music';
import {ScriptStructureSidebar} from '../structure';
import {type SidebarPanel} from './types';

type UseScriptSidebarPanelsArgs = {
    comments: ReturnType<typeof useScriptComments>,
    commentsPanelState: CommentsPanelState,
    musicState: ReturnType<typeof useScriptMusicState>,
    onAddMusic: () => void,
};

/** The panels available in the script editor's left and right sidebars. */
export const useScriptSidebarPanels = ({
    comments,
    commentsPanelState,
    musicState: {
        music,
        isLoading: isMusicLoading,
        unassignMusic,
    },
    onAddMusic,
}: UseScriptSidebarPanelsArgs) => useMemo<readonly SidebarPanel[]>(
    () => [
        {
            id: 'structure',
            label: 'Structure',
            renderContent: header => <ScriptStructureSidebar header={header} />,
        },
        {
            id: 'characters',
            label: 'Characters',
            renderContent: header => <ScriptCharactersSidebar header={header} />,
        },
        {
            id: 'music',
            label: 'Music',
            renderContent: header => (
                <ScriptMusicSidebar
                    header={header}
                    music={music}
                    isLoading={isMusicLoading}
                    onAddMusic={onAddMusic}
                    onUnassignMusic={unassignMusic}
                />
            ),
        },
        {
            id: 'comments',
            label: 'Comments',
            renderContent: header => (
                <ScriptCommentsSidebar
                    header={header}
                    comments={comments}
                    panelState={commentsPanelState}
                />
            ),
        },
    ],
    [
        comments,
        commentsPanelState,
        isMusicLoading,
        music,
        onAddMusic,
        unassignMusic,
    ],
);
