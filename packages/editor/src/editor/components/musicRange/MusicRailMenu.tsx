import type {
    DerivedMusic,
    ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import type {EditorMusicRemoveRequest} from '../../contracts';
import {
    formatOpenMusicDisplayName,
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

type MenuSection = {
    id: string,
    label?: string,
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

    items.push(music.endKind === 'explicit' ? {
        id: 'remove-out',
        label: 'Remove out',
        run: run(() => editor.commands.removeMusicOutAtBlock(menu.blockId)),
    } : {
        id: 'make-explicit',
        label: 'Make explicit here',
        run: run(() => editor.commands.setMusicOutAtBlock(menu.blockId)),
    });

    return {
        id: 'ending',
        label: `Ending: ${formatOpenMusicDisplayName(music)}`,
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
        label: `Starting: ${formatOpenMusicDisplayName(music)}`,
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
            detail: item.detail,
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
        sections.push(buildEndSection(editor, menu, endMusic, run, onOpenMusicManager));
    } else if (menu.markerKind === 'orphan') {
        sections.push({
            id: 'orphan',
            items: [
                {
                    id: 'remove-orphan',
                    label: 'Remove out',
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
                    {section.label ? (
                        <span
                            className={styles.sectionLabel}
                            data-music-rail-section-label="true"
                        >
                            {section.label}
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
