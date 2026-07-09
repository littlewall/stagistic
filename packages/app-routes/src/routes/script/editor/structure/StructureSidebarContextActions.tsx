import {useEditorActCommands} from '@stagistic/editor';
import {PlusIcon} from '@stagistic/ui';
import {useCallback} from 'react';

import {SidebarContextButton} from '../sidebar';

export const StructureSidebarContextActions = () => {
    const {insertAct} = useEditorActCommands();
    const handleClick = useCallback(() => insertAct(null), [insertAct]);

    return (
        <SidebarContextButton
            ariaLabel="Add act"
            tooltipLabel="Add act"
            onClick={handleClick}
        >
            <PlusIcon aria-hidden="true" />
        </SidebarContextButton>
    );
};
