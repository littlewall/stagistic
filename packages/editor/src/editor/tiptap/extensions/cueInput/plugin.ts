import {Plugin} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState} from '../../scriptCore';
import {blockHasCueAtom} from '../cue/cueCommands';
import {
    cueComposeKey,
    type CueComposeRawState,
    getCueComposeFromState,
    isCueComposeValid,
} from './composeState';
import {
    CUE_COMPOSE_CLOSE_META,
    CUE_COMPOSE_OPEN_META,
    CUE_TRIGGER_CHARACTER,
    STAGE_DIRECTION_NODE_TYPE,
} from './constants';
import {
    buildAbandonCue,
    buildCommitCue,
    buildOpenCueCompose,
} from './transactions';

export const createCueComposePlugin = (): Plugin<CueComposeRawState | null> => {
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
                    view.dispatch(buildCommitCue(view.state, compose));

                    return true;
                }

                if (event.key === 'Escape') {
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
        },
    });
};
