import type {DatabaseHandover, DatabaseHandoverParticipant} from '@stagistic/db/pglite';
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
} from 'react';

export type {
    DatabaseHandover,
    DatabaseHandoverParticipant,
    DatabaseHandoverState,
} from '@stagistic/db/pglite';

const DatabaseHandoverContext = createContext<DatabaseHandover | null>(null);

export const DatabaseHandoverProvider = ({handover, children}: {handover: DatabaseHandover, children: ReactNode}) => (
    <DatabaseHandoverContext value={handover}>{children}</DatabaseHandoverContext>
);

export const useDatabaseHandover = () => useContext(DatabaseHandoverContext);

/**
 * Enrols anything holding unsaved edits, so a handover to a newer version saves
 * them first. Keep `participant` stable: a new object re-enrols it.
 */
export const useDatabaseHandoverParticipant = (participant: DatabaseHandoverParticipant | null) => {
    const handover = useDatabaseHandover();

    useEffect(() => participant ? handover?.addParticipant(participant) : undefined, [handover, participant]);
};
