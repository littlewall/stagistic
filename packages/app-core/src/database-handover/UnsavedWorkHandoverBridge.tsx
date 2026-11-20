import {getUnsavedWorkParticipants} from '@stagistic/shared';
import {useEffect} from 'react';

import {useDatabaseHandover} from './DatabaseHandoverContext';

/**
 * Enrols, as one handover participant, the unsaved-work owners that live below
 * this package (the character outline in `@stagistic/ui`) and cannot reach the
 * handover context. The set is read live, so owners come and go freely.
 */
export const UnsavedWorkHandoverBridge = () => {
    const handover = useDatabaseHandover();

    useEffect(() => handover?.addParticipant({
        flush: async () => {
            const results = await Promise.all(getUnsavedWorkParticipants().map(participant => participant.flush().catch(() => false)));

            return results.every(Boolean);
        },
        stopEditing: () => {
            getUnsavedWorkParticipants().forEach(participant => {
                try {
                    participant.stopEditing?.();
                } catch (error) {
                    console.error('[handover] An unsaved-work participant failed to stop editing.', error);
                }
            });
        },
        getText: () => getUnsavedWorkParticipants()
            .map(participant => participant.getText?.() ?? '')
            .filter(Boolean)
            .join('\n\n'),
    }), [handover]);

    return null;
};
