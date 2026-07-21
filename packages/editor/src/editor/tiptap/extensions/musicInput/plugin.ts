import {Plugin} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import type {
    EditorMusicCreateRequest,
    PersistentMusicRef,
} from '../../../contracts';
import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {getActiveScriptBlockFromState} from '../../scriptCore';
import {
    blockHasMusicAtom,
    buildInsertMusicStart,
    resolveMusicTargetBlock,
    resolveNewMusicNumber,
} from '../music/musicCommands';
import {
    getMusicComposeFromState,
    isMusicComposeValid,
    musicComposeKey,
    type MusicComposeRawState,
} from './composeState';
import {
    MUSIC_COMPOSE_CLOSE_META,
    MUSIC_COMPOSE_OPEN_META,
    MUSIC_OUT_KEYWORD,
    MUSIC_TRIGGER_CHARACTER,
    STAGE_DIRECTION_NODE_TYPE,
} from './constants';
import styles from './musicCompose.module.css';
import {
    buildAbandonMusic,
    buildCommitMusic,
    buildOpenMusicCompose,
} from './transactions';

export interface MusicComposePluginOptions {
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    onMusicAssigned?: (musicId: string) => void,
}

const normalizeMusicTitle = (value: string) => {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
};

const findExactUnassignedMusic = (
    music: readonly PersistentMusicRef[],
    title: string,
): PersistentMusicRef | null => {
    const normalizedTitle = normalizeMusicTitle(title);

    if (!normalizedTitle) {
        return null;
    }

    return music.find(music => !music.assignmentLabel
        && normalizeMusicTitle(music.title) === normalizedTitle) ?? null;
};

export const createMusicComposePlugin = (
    options: MusicComposePluginOptions = {},
): Plugin<MusicComposeRawState | null> => {
    return new Plugin<MusicComposeRawState | null>({
        key: musicComposeKey,
        state: {
            init: () => null,
            apply: (tr, value, _oldState, newState) => {
                if (tr.getMeta(MUSIC_COMPOSE_CLOSE_META) === true) {
                    return null;
                }

                const openedFrom: unknown = tr.getMeta(MUSIC_COMPOSE_OPEN_META);

                if (typeof openedFrom === 'number') {
                    return {from: openedFrom};
                }

                if (value) {
                    const from = tr.mapping.map(value.from, -1);

                    return isMusicComposeValid(newState, from) ? {from} : null;
                }

                return null;
            },
        },
        appendTransaction: (transactions, oldState, newState) => {
            if (transactions.some(transaction => transaction.getMeta(MUSIC_COMPOSE_CLOSE_META) === true)) {
                return null;
            }

            const previous = musicComposeKey.getState(oldState);

            if (!previous || musicComposeKey.getState(newState)) {
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

            return newState.tr.delete(from, blockEnd).setMeta(MUSIC_COMPOSE_CLOSE_META, true);
        },
        props: {
            handleTextInput: (view, _from, _to, text) => {
                if (text !== MUSIC_TRIGGER_CHARACTER) {
                    return false;
                }

                const {state} = view;

                if (getMusicComposeFromState(state)) {
                    // Already composing a title — let '#' type into it literally.
                    return false;
                }

                const block = getActiveScriptBlockFromState(state);

                if (!block || block.blockType !== STAGE_DIRECTION_NODE_TYPE || blockHasMusicAtom(block)) {
                    return false;
                }

                view.dispatch(buildOpenMusicCompose(state, block));

                return true;
            },
            handleKeyDown: (view, event) => {
                const compose = getMusicComposeFromState(view.state);

                if (!compose) {
                    return false;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();

                    const title = compose.query.trim();

                    if (title.length === 0 || title.toLocaleLowerCase() === MUSIC_OUT_KEYWORD) {
                        view.dispatch(buildCommitMusic(view.state, compose));

                        return true;
                    }

                    const existingMusic = findExactUnassignedMusic(
                        options.persistentMusicRef?.current ?? [],
                        title,
                    );

                    if (existingMusic) {
                        view.dispatch(buildCommitMusic(view.state, compose, {
                            musicId: existingMusic.id,
                            kind: existingMusic.kind,
                            title: existingMusic.title,
                        }));
                        options.onMusicAssigned?.(existingMusic.id);

                        return true;
                    }

                    const block = getActiveScriptBlockFromState(view.state);

                    if (!options.onRequestCreateMusic || !block) {
                        view.dispatch(buildCommitMusic(view.state, compose));

                        return true;
                    }

                    const blockId = block.id;
                    const request: EditorMusicCreateRequest = {
                        title,
                        blockId,
                        complete: music => {
                            const targetBlock = resolveMusicTargetBlock(view.state, blockId);

                            if (!targetBlock || blockHasMusicAtom(targetBlock)) {
                                return false;
                            }

                            view.dispatch(buildInsertMusicStart(view.state, targetBlock, music.title, 'open', {
                                musicId: music.id,
                                kind: music.kind,
                            }).scrollIntoView());
                            options.onMusicAssigned?.(music.id);
                            view.focus();

                            return true;
                        },
                    };

                    view.dispatch(buildAbandonMusic(view.state, compose));
                    options.onRequestCreateMusic(request);

                    return true;
                }

                if (event.key === 'Escape') {
                    event.preventDefault();
                    view.dispatch(buildAbandonMusic(view.state, compose));

                    return true;
                }

                if (event.key === 'Backspace' && compose.query.length === 0) {
                    /*
                     * Backspace on an empty title cancels the compose (rather than
                     * leaving a stranded placeholder that swallows the next '#').
                     */
                    event.preventDefault();
                    view.dispatch(buildAbandonMusic(view.state, compose));

                    return true;
                }

                return false;
            },
            handleDOMEvents: {
                blur: view => {
                    const compose = getMusicComposeFromState(view.state);

                    if (!compose) {
                        return false;
                    }

                    // Enter is the only commit path; leaving the editor discards the draft.
                    view.dispatch(
                        buildAbandonMusic(view.state, compose),
                    );

                    return false;
                },
            },
            decorations: state => {
                const compose = getMusicComposeFromState(state);

                if (!compose) {
                    return null;
                }

                return DecorationSet.create(state.doc, [
                    Decoration.inline(compose.from, Math.max(compose.to, compose.from + 1), {
                        class: styles.composePill,
                        'data-music-compose': 'active',
                        'data-music-number': (() => {
                            const block = getActiveScriptBlockFromState(state);

                            return block
                                ? resolveNewMusicNumber(buildIndexSnapshotFromPmDoc(state.doc), block.id) ?? ''
                                : '';
                        })(),
                    }),
                ]);
            },
        },
    });
};
