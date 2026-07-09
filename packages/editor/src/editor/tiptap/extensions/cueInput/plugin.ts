import {Plugin} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import type {
    EditorCueCreateRequest,
    PersistentCueRef,
} from '../../../contracts';
import {getActiveScriptBlockFromState} from '../../scriptCore';
import {
    blockHasCueAtom,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from '../cue/cueCommands';
import {
    cueComposeKey,
    type CueComposeRawState,
    getCueComposeFromState,
    isCueComposeValid,
} from './composeState';
import {
    CUE_COMPOSE_CLOSE_META,
    CUE_COMPOSE_OPEN_META,
    CUE_OUT_KEYWORD,
    CUE_TRIGGER_CHARACTER,
    STAGE_DIRECTION_NODE_TYPE,
} from './constants';
import styles from './cueCompose.module.css';
import {
    buildAbandonCue,
    buildCommitCue,
    buildOpenCueCompose,
} from './transactions';

export interface CueComposePluginOptions {
    persistentCuesRef?: {current: readonly PersistentCueRef[]},
    onRequestCreateCue?: (request: EditorCueCreateRequest) => void,
    onCueAssigned?: (cueId: string) => void,
}

const normalizeCueTitle = (value: string) => {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
};

const findExactUnassignedCue = (
    cues: readonly PersistentCueRef[],
    title: string,
): PersistentCueRef | null => {
    const normalizedTitle = normalizeCueTitle(title);

    if (!normalizedTitle) {
        return null;
    }

    return cues.find(cue => !cue.assignmentLabel
        && normalizeCueTitle(cue.title) === normalizedTitle) ?? null;
};

export const createCueComposePlugin = (
    options: CueComposePluginOptions = {},
): Plugin<CueComposeRawState | null> => {
    return new Plugin<CueComposeRawState | null>({
        key: cueComposeKey,
        state: {
            init: () => null,
            apply: (tr, value, _oldState, newState) => {
                if (tr.getMeta(CUE_COMPOSE_CLOSE_META) === true) {
                    return null;
                }

                const openedFrom: unknown = tr.getMeta(CUE_COMPOSE_OPEN_META);

                if (typeof openedFrom === 'number') {
                    return {from: openedFrom};
                }

                if (value) {
                    const from = tr.mapping.map(value.from, -1);

                    return isCueComposeValid(newState, from) ? {from} : null;
                }

                return null;
            },
        },
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some(transaction => transaction.getMeta(CUE_COMPOSE_CLOSE_META) === true)) {
                return null;
            }

            const previous = cueComposeKey.getState(oldState);

            if (!previous || cueComposeKey.getState(newState)) {
                return null;
            }

            // Compose cleared implicitly (caret left the block) — drop the orphaned placeholder + title.
            let from = previous.from;

            transactions.forEach(transaction => {
                from = transaction.mapping.map(from, -1);
            });

            if (from < 0 || from > newState.doc.content.size) {
                return null;
            }

            const blockEnd = newState.doc.resolve(from).end();

            if (blockEnd <= from) {
                return null;
            }

            return newState.tr.delete(from, blockEnd).setMeta(CUE_COMPOSE_CLOSE_META, true);
        },
        props: {
            handleTextInput: (view, _from, _to, text) => {
                if (text !== CUE_TRIGGER_CHARACTER) {
                    return false;
                }

                const {state} = view;

                if (getCueComposeFromState(state)) {
                    // Already composing a title — let '#' type into it literally.
                    return false;
                }

                const block = getActiveScriptBlockFromState(state);

                if (!block || block.blockType !== STAGE_DIRECTION_NODE_TYPE || blockHasCueAtom(block)) {
                    return false;
                }

                view.dispatch(buildOpenCueCompose(state, block));

                return true;
            },
            handleKeyDown: (view, event) => {
                const compose = getCueComposeFromState(view.state);

                if (!compose) {
                    return false;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();
                    const title = compose.query.trim();

                    if (title.length === 0 || title.toLocaleLowerCase() === CUE_OUT_KEYWORD) {
                        view.dispatch(buildCommitCue(view.state, compose));

                        return true;
                    }

                    const existingCue = findExactUnassignedCue(
                        options.persistentCuesRef?.current ?? [],
                        title,
                    );

                    if (existingCue) {
                        view.dispatch(buildCommitCue(view.state, compose, {
                            cueId: existingCue.id,
                            kind: existingCue.kind,
                            title: existingCue.title,
                        }));
                        options.onCueAssigned?.(existingCue.id);

                        return true;
                    }

                    const block = getActiveScriptBlockFromState(view.state);

                    if (!options.onRequestCreateCue || !block) {
                        view.dispatch(buildCommitCue(view.state, compose));

                        return true;
                    }

                    const blockId = block.id;
                    const request: EditorCueCreateRequest = {
                        title,
                        blockId,
                        complete: cue => {
                            const targetBlock = resolveCueTargetBlock(view.state, blockId);

                            if (!targetBlock || blockHasCueAtom(targetBlock)) {
                                return false;
                            }

                            view.dispatch(buildInsertCueStart(view.state, targetBlock, cue.title, 'open', {
                                cueId: cue.id,
                                kind: cue.kind,
                            }).scrollIntoView());
                            options.onCueAssigned?.(cue.id);
                            view.focus();

                            return true;
                        },
                    };

                    view.dispatch(buildAbandonCue(view.state, compose));
                    options.onRequestCreateCue(request);

                    return true;
                }

                if (event.key === 'Escape') {
                    event.preventDefault();
                    view.dispatch(buildAbandonCue(view.state, compose));

                    return true;
                }

                if (event.key === 'Backspace' && compose.query.length === 0) {
                    /*
                     * Backspace on an empty title cancels the compose (rather than
                     * leaving a stranded placeholder that swallows the next '#').
                     */
                    event.preventDefault();
                    view.dispatch(buildAbandonCue(view.state, compose));

                    return true;
                }

                return false;
            },
            handleDOMEvents: {
                blur: view => {
                    const compose = getCueComposeFromState(view.state);

                    if (!compose) {
                        return false;
                    }

                    // Enter is the only commit path; leaving the editor discards the draft.
                    view.dispatch(
                        buildAbandonCue(view.state, compose),
                    );

                    return false;
                },
            },
            decorations: state => {
                const compose = getCueComposeFromState(state);

                if (!compose) {
                    return null;
                }

                return DecorationSet.create(state.doc, [
                    Decoration.inline(compose.from, Math.max(compose.to, compose.from + 1), {
                        class: styles.composePill,
                        'data-cue-compose': 'active',
                    }),
                ]);
            },
        },
    });
};
