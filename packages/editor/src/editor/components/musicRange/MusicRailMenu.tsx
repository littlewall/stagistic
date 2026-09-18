import type {
    DerivedMusic,
    ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import type {EditorMusicRemoveRequest} from '../../contracts';
import {
    canResetMusicEnd,
    formatFullMusicDisplayName,
    resolveMusicBoundaryActions,
} from '../blockActions/stageDirectionMusicActions';
import {scrollToMusicRailBlock} from './musicRailDom';
import styles from './MusicRangeOverlay.module.css';

export type MusicRailMenuState = {
    blockId: string,
    markerKind: string,
    startMusicId: string | null,
    endMusicId: string | null,
    left: number,
    top: number,
};

type MenuItem = {
    id: string,
    label: string,
    detail?: string,
    run: () => void,
};

/*
 * `kind` says what this marker does to the music, `name` says which music. They
 * are separate lines because the name is the part that has to be recognised and
 * a title is as long as it is — clipping it to fit one row turned the header
 * into a riddle.
 */
type MenuSectionHeader = {
    kind: string,
    name: string,
};

type MenuSection = {
    id: string,
    header?: MenuSectionHeader,
    musicId?: string,
    items: MenuItem[],
};

type MusicRailMenuProps = {
    editor: TiptapEditor,
    menu: MusicRailMenuState,
    snapshot: ScriptBlockIndexSnapshot,
    onClose: () => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
};

const buildEndSection = (
    editor: TiptapEditor,
    menu: MusicRailMenuState,
    snapshot: ScriptBlockIndexSnapshot,
    music: DerivedMusic,
    run: (action: () => void) => () => void,
    onOpenMusicManager?: (musicId: string) => void,
): MenuSection => {
    const items: MenuItem[] = [
        {
            id: 'go-to-start',
            label: 'Go to start',
            run: run(() => scrollToMusicRailBlock(editor, music.startBlockId)),
        },
    ];

    if (onOpenMusicManager) {
        items.push({
            id: 'manage-ending',
            label: 'Manage music',
            run: run(() => onOpenMusicManager(music.musicId)),
        });
    }

    /*
     * Only offered where there is a placed end to hand back: an end that is
     * already automatic has nothing to release, and pinning it where it already
     * falls was a command about the document's bookkeeping, not about the music.
     */
    if (music.endKind === 'explicit' && canResetMusicEnd(snapshot, menu.blockId)) {
        items.push({
            id: 'remove-out',
            label: 'Reset music end',
            run: run(() => editor.commands.removeMusicOutAtBlock(menu.blockId)),
        });
    }

    return {
        id: 'ending',
        header: {
            kind: 'End music:',
            name: formatFullMusicDisplayName(music),
        },
        musicId: music.musicId,
        items,
    };
};

const buildStartSection = (
    editor: TiptapEditor,
    music: DerivedMusic,
    run: (action: () => void) => () => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
): MenuSection => {
    const items: MenuItem[] = [
        {
            id: 'go-to-end',
            label: 'Go to effective end',
            run: run(() => scrollToMusicRailBlock(editor, music.effectiveEndBlockId)),
        },
    ];

    if (onOpenMusicManager) {
        items.push({
            id: 'manage-starting',
            label: 'Manage music',
            run: run(() => onOpenMusicManager(music.musicId)),
        });
    }

    items.push({
        id: 'unassign-music',
        label: 'Unassign music',
        run: run(() => {
            if (onRequestRemoveMusic) {
                onRequestRemoveMusic({
                    musicId: music.musicId,
                    title: music.title,
                    complete: () => editor.commands.unassignMusic(music.musicId),
                });

                return;
            }

            editor.commands.unassignMusic(music.musicId);
        }),
    });

    return {
        id: 'starting',
        header: {
            kind: 'Start music:',
            name: formatFullMusicDisplayName(music),
        },
        musicId: music.musicId,
        items,
    };
};

const buildBoundarySection = (
    editor: TiptapEditor,
    menu: MusicRailMenuState,
    snapshot: ScriptBlockIndexSnapshot,
    run: (action: () => void) => () => void,
): MenuSection | null => {
    const blockType = snapshot.blocks.find(block => block.blockId === menu.blockId)?.blockType;
    const action = blockType ? resolveMusicBoundaryActions({
        editor,
        blockId: menu.blockId,
        blockType: blockType as never,
    })[0] : null;

    if (action?.kind !== 'submenu') {
        return null;
    }

    return {
        id: 'boundary',
        items: action.items.map(item => ({
            id: item.id,
            label: item.label,
            // This menu gives the detail a line of its own, so it takes the whole name.
            detail: item.detailFull ?? item.detail,
            run: run(item.run),
        })),
    };
};

export const MusicRailMenu = ({
    editor,
    menu,
    snapshot,
    onClose,
    onOpenMusicManager,
    onRequestRemoveMusic,
}: MusicRailMenuProps) => {
    const run = (action: () => void) => () => {
        onClose();
        action();
    };
    const startMusic = snapshot.music.find(music => music.musicId === menu.startMusicId) ?? null;
    const endMusic = snapshot.music.find(music => music.musicId === menu.endMusicId) ?? null;
    const sections: MenuSection[] = [];

    if (endMusic) {
        sections.push(buildEndSection(editor, menu, snapshot, endMusic, run, onOpenMusicManager));
    } else if (menu.markerKind === 'orphan') {
        sections.push({
            id: 'orphan',
            items: [
                {
                    /*
                     * A stray end atom belonging to no music: there is nothing
                     * to hand back to, it can only go.
                     */
                    id: 'remove-orphan',
                    label: 'Remove stray end',
                    run: run(() => editor.commands.removeMusicOutAtBlock(menu.blockId)),
                },
            ],
        });
    }

    if (startMusic) {
        sections.push(buildStartSection(
            editor,
            startMusic,
            run,
            onOpenMusicManager,
            onRequestRemoveMusic,
        ));
    }

    if (sections.length === 0) {
        const boundary = buildBoundarySection(editor, menu, snapshot, run);

        if (boundary) {
            sections.push(boundary);
        }
    }

    if (sections.length === 0) {
        return null;
    }

    return (
        <div
            className={styles.menu}
            role="menu"
            data-music-rail-menu="true"
            style={{
                left: menu.left, top: menu.top, transform: 'translateX(-100%)',
            }}
            onPointerDown={event => event.stopPropagation()}
        >
            {sections.map(section => (
                <div
                    key={section.id}
                    className={styles.section}
                >
                    {section.header ? (
                        <span
                            className={styles.sectionLabel}
                            data-music-rail-section-label="true"
                        >
                            <span
                                className={styles.sectionKind}
                                data-music-rail-section-kind="true"
                            >
                                {section.header.kind}
                            </span>
                            <span
                                className={styles.sectionName}
                                data-music-rail-section-name="true"
                            >
                                {section.header.name}
                            </span>
                        </span>
                    ) : null}
                    {section.items.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            className={styles.menuItem}
                            onClick={item.run}
                        >
                            <span>{item.label}</span>
                            {item.detail ? <span className={styles.detail}>{item.detail}</span> : null}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};
