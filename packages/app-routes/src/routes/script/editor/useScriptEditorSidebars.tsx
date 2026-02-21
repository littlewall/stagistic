import type {ComponentProps} from 'react';
import {useMemo} from 'react';

import {ScriptCharactersSidebar} from './characters/ScriptCharactersSidebar';
import {ScriptStructureSidebar} from './structure';

interface UseScriptEditorSidebarsArgs {
    structureSidebarProps: ComponentProps<typeof ScriptStructureSidebar>,
    characterSidebarProps: ComponentProps<typeof ScriptCharactersSidebar>,
}

export const useScriptEditorSidebars = ({
    structureSidebarProps,
    characterSidebarProps,
}: UseScriptEditorSidebarsArgs) => {
    const leftSidebarContent = useMemo(() => (
        <ScriptStructureSidebar {...structureSidebarProps} />
    ), [structureSidebarProps]);
    const rightSidebarContent = useMemo(() => (
        <ScriptCharactersSidebar {...characterSidebarProps} />
    ), [characterSidebarProps]);

    return {
        leftSidebarContent,
        rightSidebarContent,
    };
};
