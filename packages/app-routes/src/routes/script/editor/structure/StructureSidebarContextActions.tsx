import {useEditorActCommands} from '@stagistic/editor';
import {IconDropdownMenu, PlusIcon} from '@stagistic/ui';
import {useCallback} from 'react';

const ADD_ITEMS = [{id: 'add-act', label: 'Add act'}];

export const StructureSidebarContextActions = () => {
    const {insertAct} = useEditorActCommands();
    const handleAction = useCallback(
        (id: string) => {
            if (id === 'add-act') {
                insertAct(null);
            }
        },
        [insertAct],
    );

    return <IconDropdownMenu aria-label="Add to structure" icon={<PlusIcon aria-hidden="true" />} size="xs" items={ADD_ITEMS} onAction={handleAction} />;
};
