import {useEditorActCommands} from '@stagistic/editor';
import {useCallback} from 'react';

import {SidebarContextButton} from '../sidebar';

export const StructureSidebarContextActions = () => {
    const {insertAct} = useEditorActCommands();
    const handleClick = useCallback(() => insertAct(null), [insertAct]);

    return (
        <SidebarContextButton ariaLabel="Insert ACT" onClick={handleClick}>
            +
        </SidebarContextButton>
    );
};
