import {SidebarContextButton} from '../sidebar';

interface StructureSidebarContextActionsProps {
    onInsertAct: () => void,
}

export const StructureSidebarContextActions = ({
    onInsertAct,
}: StructureSidebarContextActionsProps) => (
    <SidebarContextButton ariaLabel="Insert ACT" onClick={onInsertAct}>
        +
    </SidebarContextButton>
);
