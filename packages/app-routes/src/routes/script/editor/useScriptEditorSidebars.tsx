import {EditorSidebar} from '@stagistic/ui';
import type {ComponentProps} from 'react';
import {useMemo} from 'react';

import {ScriptStructureSidebar} from './structure';

interface UseScriptEditorSidebarsArgs {
    structureSidebarProps: ComponentProps<typeof ScriptStructureSidebar>,
    characterSidebarProps: ComponentProps<typeof EditorSidebar>,
}

export const useScriptEditorSidebars = ({
    structureSidebarProps,
    characterSidebarProps,
}: UseScriptEditorSidebarsArgs) => {
    const leftSidebarContent = useMemo(() => (
        <ScriptStructureSidebar {...structureSidebarProps} />
    ), [structureSidebarProps]);
    const rightSidebarContent = useMemo(() => (
        <EditorSidebar {...characterSidebarProps} />
    ), [characterSidebarProps]);

    return {
        leftSidebarContent,
        rightSidebarContent,
    };
};
