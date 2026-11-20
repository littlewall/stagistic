import type {SceneBoardAct} from '@stagistic/script';
import type {ModalFocusTarget} from '@stagistic/ui';
import {useState} from 'react';

import {BoardDeleteActModal} from './BoardDeleteActModal';

interface PendingAct {
    blockId: string,
    name: string,
    previousName: string | null,
}

interface DeleteActTarget {
    blockId: string,
    returnFocus: ModalFocusTarget,
}

/* After the act (and its menu trigger) is gone, the next meaningful stop is the act-add control. */
const addActAtEndFocus = () => [...document.querySelectorAll<HTMLElement>('button')].find(
    button => button.getAttribute('aria-label') === 'Add act at the end',
) ?? null;

/*
 * Resolved from the live model, never the filtered Wall: the first real act (the default,
 * unassigned group does not count, even when scenes precede the first heading) leaves its
 * scenes unassigned; a later one hands them to the previous real act.
 */
const resolvePendingAct = (acts: readonly SceneBoardAct[], target: DeleteActTarget | null): PendingAct | null => {
    if (target === null) return null;

    const realActs = acts.filter(act => act.actBlockId !== null);
    const index = realActs.findIndex(act => act.actBlockId === target.blockId);

    // The act is already gone (deleted elsewhere, undo): nothing to ask about.
    if (index < 0) return null;

    return {
        blockId: target.blockId,
        name: realActs[index].name,
        previousName: index > 0 ? realActs[index - 1].name : null,
    };
};

/** Owns the act-delete confirmation: the target stays the act's block id, so renames cannot derail it. */
export const useBoardDeleteAct = (
    acts: readonly SceneBoardAct[],
    deleteAct: (blockId: string) => boolean,
) => {
    const [target, setTarget] = useState<DeleteActTarget | null>(null);
    const pendingAct = resolvePendingAct(acts, target);

    /*
     * An act that disappeared (deleted elsewhere, undo) dismisses the request for good: the
     * state is dropped during render, so a confirmation cannot resurrect from stale state
     * when the act later comes back. React immediately re-runs this render.
     */
    if (target !== null && pendingAct === null) setTarget(null);

    const requestDeleteAct = (blockId: string, actName: string) => {
        setTarget({
            blockId,
            // A label, not an element held forever: the trigger re-renders like any other control.
            returnFocus: () => [...document.querySelectorAll<HTMLElement>('button')].find(
                button => button.getAttribute('aria-label') === `Act ${actName} actions`,
            ) ?? null,
        });
    };

    const modal = pendingAct === null ? null : (
        <BoardDeleteActModal
            returnFocus={target?.returnFocus}
            fallbackFocus={addActAtEndFocus}
            actName={pendingAct.name}
            previousActName={pendingAct.previousName}
            onClose={() => setTarget(null)}
            onConfirm={() => {
                deleteAct(pendingAct.blockId);
                setTarget(null);
                /*
                 * The act's menu trigger disappears with it, and the modal's own restore may
                 * land on it a frame before the board drops the section: park focus on a
                 * control that survives, the way the scene composer does on cancel.
                 */
                requestAnimationFrame(() => addActAtEndFocus()?.focus());
            }}
        />
    );

    return {requestDeleteAct, modal};
};
