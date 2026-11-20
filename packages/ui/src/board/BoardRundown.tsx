import {
    DEFAULT_SCENE_NUMBER_FORMAT,
    formatSceneNumber,
    type SceneNumberFormat,
} from '@stagistic/script';

import {Text} from '../primitives/Text/Text';
import {type BoardCharacterChip, CharacterDot} from './BoardCharacterDot';
import styles from './BoardRundown.module.css';
import {useRundownNavigation} from './useRundownNavigation';

/* Spoken as the editor shows it, without the trailing mark: "1." and "1)" read "1"; a hidden number falls back to the scene's ordinal. */
const spokenNumber = (formatted: string, ordinal: number) => formatted.replace(/[.)]$/, '') || String(ordinal);

export interface BoardRundownSong {
    /** Identifies the song; several can start in one block. */
    musicId: string,
    /** The block the song starts at; where a click opens the Editor. */
    startBlockId: string,
    /** As the Editor labels it: `1)` or `1.A)`. */
    label: string,
    title: string,
    kind: 'instrumental' | 'hit' | 'song',
    singers: readonly BoardCharacterChip[],
    /** Length in pages, rounded to half a page; null while unknown. */
    pageLength: number | null,
}

export interface BoardRundownScene {
    headingBlockId: string,
    number: number,
    title: string,
    chips: readonly BoardCharacterChip[],
    /** Length in pages, rounded to half a page; null while unknown. */
    pageLength: number | null,
    songs: readonly BoardRundownSong[],
}

export interface BoardRundownAct {
    key: string,
    name: string,
    sceneCount: number,
    songCount: number,
    /** Sum of the shown scenes' lengths, rounded once to half a page; null while any is unknown. */
    pageLength: number | null,
    scenes: readonly BoardRundownScene[],
}

export interface BoardRundownProps {
    acts: readonly BoardRundownAct[],
    /** Songs before the first scene, above the first act. */
    preSceneSongs?: readonly BoardRundownSong[],
    onOpen: (blockId: string) => void,
    sceneNumberFormat?: SceneNumberFormat,
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const KIND_TEXT = {
    instrumental: 'Instrumental',
    hit: 'Hit',
    song: 'Song',
} as const;

const names = (chips: readonly BoardCharacterChip[]) => chips.map(chip => chip.name);

const songRowId = (song: BoardRundownSong) => `song:${song.musicId}`;
const sceneRowId = (scene: BoardRundownScene) => `scene:${scene.headingBlockId}`;

const People = ({chips}: {chips: readonly BoardCharacterChip[]}) => (
    <span className={styles.people} data-people aria-hidden="true">
        {chips.map(chip => (
            <span key={chip.id} className={styles.person}>
                <CharacterDot chip={chip} />
                {chip.name}
            </span>
        ))}
    </span>
);

const KindTag = ({kind}: {kind: BoardRundownSong['kind']}) => <span className={styles.kind} data-kind>{KIND_TEXT[kind]}</span>;

/** "½ p.", "1 p.", "1½ pp.": the number and the unit are separate cells so units and whole numbers line up down the column. */
const formatPageLength = (length: number) => {
    const whole = Math.floor(length);
    const hasHalf = length - whole >= 0.5;
    const text = hasHalf ? `${whole === 0 ? '' : whole}½` : String(whole);

    return {text, unit: length > 1 ? 'pp.' : 'p.'};
};

const describePageLength = (length: number) => {
    if (length === 0.5) return 'half a page';

    return length === 1 ? '1 page' : `${length} pages`;
};

const PageLength = ({length, isHidden = false}: {length: number | null, isHidden?: boolean}) => {
    if (length === null) return null;

    const {text, unit} = formatPageLength(length);

    return (
        <span className={styles.pages} data-pages aria-hidden={isHidden ? 'true' : undefined}>
            <span className={styles.pagesNumber}>{text}</span>
            <span>{unit}</span>
        </span>
    );
};

/** The Rundown: acts, their scenes and the songs in each scene, read-only; a row opens the Editor. */
export const BoardRundown = ({
    acts,
    preSceneSongs = [],
    onOpen,
    sceneNumberFormat = DEFAULT_SCENE_NUMBER_FORMAT,
}: BoardRundownProps) => {
    const rowIds = [
        ...preSceneSongs.map(songRowId),
        ...acts.flatMap(act => act.scenes.flatMap(scene => [sceneRowId(scene), ...scene.songs.map(songRowId)])),
    ];
    const rowIndexById = new Map(rowIds.map((id, position) => [id, position]));
    const {rowStopProps, listProps} = useRundownNavigation(rowIds.length);

    const renderSong = (song: BoardRundownSong) => {
        const singers = names(song.singers);
        const name = [
            'Song ' + song.label.replace(/\)$/, ''),
            song.title,
            ...song.kind === 'song' ? [] : [KIND_TEXT[song.kind]],
            ...song.pageLength === null ? [] : [describePageLength(song.pageLength)],
            ...singers.length > 0 ? [`sung by ${singers.join(', ')}`] : [],
        ];

        return (
            <li key={songRowId(song)}>
                <button
                    type="button"
                    className={`${styles.row} ${styles.song}`}
                    aria-label={name.join(', ')}
                    onClick={() => onOpen(song.startBlockId)}
                    {...rowStopProps(rowIndexById.get(songRowId(song)) ?? 0)}
                >
                    <span className={styles.label} aria-hidden="true">{song.label}</span>
                    <span className={styles.title} aria-hidden="true">{song.title}</span>
                    <KindTag kind={song.kind} />
                    <PageLength length={song.pageLength} />
                    <People chips={song.singers} />
                </button>
            </li>
        );
    };

    return (
        <div className={styles.rundown} {...listProps}>
            {preSceneSongs.length > 0 ? <ul className={styles.list} aria-label="Before the first scene">{preSceneSongs.map(renderSong)}</ul> : null}
            {acts.map(act => (
                <section key={act.key} className={styles.act} aria-label={act.name}>
                    <div className={styles.actHeading}>
                        <Text
                            as="h2"
                            variant="eyebrow"
                            size="xs"
                            aria-label={act.pageLength === null ? undefined : `${act.name}, ${describePageLength(act.pageLength)}`}
                        >
                            {act.name}
                        </Text>
                        <PageLength length={act.pageLength} isHidden />
                        <span className={styles.summary} data-summary>{[
                            plural(act.sceneCount, 'scene'),
                            plural(act.songCount, 'song'),
                        ].join(' · ')}
                        </span>
                    </div>
                    <ul className={styles.list}>
                        {act.scenes.map(scene => {
                            const number = formatSceneNumber(scene.number, sceneNumberFormat);
                            const name = [
                                `Scene ${spokenNumber(number, scene.number)}`,
                                scene.title,
                                ...scene.pageLength === null ? [] : [describePageLength(scene.pageLength)],
                                ...names(scene.chips),
                            ];

                            return (
                                <li key={sceneRowId(scene)}>
                                    <button
                                        type="button"
                                        className={styles.row}
                                        aria-label={name.join(', ')}
                                        onClick={() => onOpen(scene.headingBlockId)}
                                        {...rowStopProps(rowIndexById.get(sceneRowId(scene)) ?? 0)}
                                    >
                                        <span className={styles.label} aria-hidden="true">{number}</span>
                                        <span className={styles.title} aria-hidden="true">{scene.title}</span>
                                        <PageLength length={scene.pageLength} />
                                        <People chips={scene.chips} />
                                    </button>
                                    {scene.songs.length > 0 ? <ul className={styles.list}>{scene.songs.map(renderSong)}</ul> : null}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
};
