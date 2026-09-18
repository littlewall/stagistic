import type {EditorSettings} from '@stagistic/script';

import type {
    ContentsActGroup,
    ContentsInitialPagePlan,
    ContentsMusicEntry,
    ContentsSceneEntry,
} from '../../plan';
import type {VisualRun} from '../../visualLine';
import type {VisualPage} from '../buildCharactersAndPlacesPages';
import {
    type ContentsGeometry,
    createContentsGeometry,
} from './contentsGeometry';
import type {ContentsPageNumbers} from './contentsPageNumbers';
import {
    centeredRun,
    columnHeaderLine,
    makeRun,
    numberRuns,
    wrapToWidth,
} from './contentsRuns';

const HEADINGS: Record<ContentsInitialPagePlan['variant'], string> = {
    scenes: 'SCENES',
    'musical-numbers': 'MUSICAL NUMBERS',
    'scenes-and-musical-numbers': 'SCENES AND MUSICAL NUMBERS',
};

const NESTED_MUSIC_INDENT_CHARS = 5;
const SCENE_TO_MUSIC_GAP_SCALE = 0.25;
const SCENE_GAP_SCALE = 0.35;
const MUSIC_TO_MUSIC_GAP_SCALE = 0.5;
const MUSIC_TO_SCENE_GAP_SCALE = 0.5;
const INSTRUMENTAL_LABEL = 'Instrumental';

interface Cursor {
    pages: VisualPage[],
    current: VisualPage,
    y: number,
    actName: string | null,
}

const startPage = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
) => {
    const page: VisualPage = [
        {
            y: geometry.contentTopPx,
            runs: [centeredRun(geometry, heading, geometry.headingFontSizePx, {bold: true})],
        },
    ];

    cursor.pages.push(page);
    cursor.current = page;
    cursor.y = geometry.contentTopPx
        + geometry.headingLineHeightPx
        + geometry.bodyLineHeightPx;

    if (cursor.actName !== null) {
        cursor.current.push({
            y: cursor.y,
            runs: [centeredRun(geometry, cursor.actName, geometry.bodyFontSizePx, {bold: true})],
        });
        cursor.y += 2 * geometry.bodyLineHeightPx;
    }

    cursor.current.push(columnHeaderLine(geometry, cursor.y));
    cursor.y += 2 * geometry.bodyLineHeightPx;
};

/** Starts a new page when `heightPx` of unbreakable content will not fit. */
const ensureSpace = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    heightPx: number,
) => {
    if (cursor.y + heightPx <= geometry.contentBottomPx) {
        return;
    }

    startPage(cursor, geometry, heading);
};

const pushActHeading = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    name: string | null,
    isFirstAct: boolean,
) => {
    cursor.actName = name;

    if (name === null) {
        return;
    }

    if (!isFirstAct) {
        cursor.y += 2 * geometry.bodyLineHeightPx;
    }

    /* Heading plus at least one entry line, so a heading is never stranded. */
    if (cursor.y + 3 * geometry.bodyLineHeightPx > geometry.contentBottomPx) {
        startPage(cursor, geometry, heading);

        return;
    }

    cursor.current.push({
        y: cursor.y,
        runs: [centeredRun(geometry, name, geometry.bodyFontSizePx, {bold: true})],
    });
    cursor.y += 2 * geometry.bodyLineHeightPx;
};

const pushSceneLine = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    scene: ContentsSceneEntry,
    hasNestedMusic: boolean,
    pageNumbers?: ContentsPageNumbers,
) => {
    const requiredPx = geometry.bodyLineHeightPx * (hasNestedMusic ? 3.5 : 1 + SCENE_GAP_SCALE);

    ensureSpace(cursor, geometry, heading, requiredPx);

    const label = `${scene.sceneNumber}. ${scene.title}`;
    const scriptPage = pageNumbers?.scriptPageNumberByBlockId.get(scene.startBlockId) ?? null;

    cursor.current.push({
        y: cursor.y,
        runs: [makeRun(label, geometry.contentLeftPx, geometry.bodyFontSizePx, {bold: true}), ...numberRuns(geometry, scriptPage, null)],
        sourceBlockId: scene.startBlockId,
    });
    cursor.y += geometry.bodyLineHeightPx;
};

const pushWrapped = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    {
        value,
        startPx,
        fontSizePx,
        charWidthPx,
        emphasis,
        trailingRuns,
    }: {
        value: string,
        startPx: number,
        fontSizePx: number,
        charWidthPx: number,
        emphasis: {bold?: boolean, italic?: boolean},
        trailingRuns: VisualRun[],
    },
) => {
    const maxChars = Math.max(1, Math.floor((geometry.titleRightPx - startPx) / charWidthPx));

    wrapToWidth(value, maxChars).forEach((line, index) => {
        cursor.current.push({
            y: cursor.y,
            runs: [makeRun(line, startPx, fontSizePx, emphasis), ...index === 0 ? trailingRuns : []],
        });
        cursor.y += geometry.bodyLineHeightPx;
    });
};

const pushMusicEntry = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    entry: ContentsMusicEntry,
    indentChars: number,
    pageNumbers?: ContentsPageNumbers,
) => {
    const titleStartPx = geometry.contentLeftPx + indentChars * geometry.bodyCharWidthPx;
    const label = `${entry.number} ${entry.title}`;
    const scriptPage = pageNumbers?.scriptPageNumberByBlockId.get(entry.startBlockId) ?? null;
    const scorePage = pageNumbers?.scoreStartPageByMusicId.get(entry.musicId) ?? null;

    const singerStartPx = titleStartPx
        + `${entry.number} `.length * geometry.bodyCharWidthPx;

    const titleLines = wrapToWidth(label, Math.max(
        1,
        Math.floor((geometry.titleRightPx - titleStartPx) / geometry.bodyCharWidthPx),
    )).length;
    const singerText = entry.isInstrumental ? INSTRUMENTAL_LABEL : entry.singers.join(', ');
    const singerLines = wrapToWidth(singerText, Math.max(
        1,
        Math.floor((geometry.titleRightPx - singerStartPx) / geometry.smallCharWidthPx),
    )).length;

    ensureSpace(cursor, geometry, heading, (titleLines + singerLines) * geometry.bodyLineHeightPx);

    pushWrapped(cursor, geometry, {
        value: label,
        startPx: titleStartPx,
        fontSizePx: geometry.bodyFontSizePx,
        charWidthPx: geometry.bodyCharWidthPx,
        emphasis: {bold: true},
        trailingRuns: numberRuns(geometry, scriptPage, scorePage),
    });

    pushWrapped(cursor, geometry, {
        value: singerText,
        startPx: singerStartPx,
        fontSizePx: geometry.smallFontSizePx,
        charWidthPx: geometry.smallCharWidthPx,
        emphasis: {italic: true},
        trailingRuns: [],
    });
};

export const buildContentsPages = (
    plan: ContentsInitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): VisualPage[] => {
    const geometry = createContentsGeometry(settings, plan.showScoreColumn);
    const heading = HEADINGS[plan.variant];
    const cursor: Cursor = {
        pages: [], current: [], y: 0, actName: null,
    };

    startPage(cursor, geometry, heading);

    plan.acts.forEach((act: ContentsActGroup, actIndex) => {
        pushActHeading(cursor, geometry, heading, act.name, actIndex === 0);

        if (plan.variant === 'musical-numbers') {
            const allMusic = [...act.preSceneMusic, ...act.scenes.flatMap(scene => scene.music)];

            allMusic.forEach((entry, index) => {
                pushMusicEntry(cursor, geometry, heading, entry, 0, pageNumbers);

                if (index < allMusic.length - 1) {
                    cursor.y += geometry.bodyLineHeightPx * MUSIC_TO_MUSIC_GAP_SCALE;
                }
            });

            return;
        }

        act.preSceneMusic.forEach((entry, index) => {
            pushMusicEntry(cursor, geometry, heading, entry, NESTED_MUSIC_INDENT_CHARS, pageNumbers);

            const isLast = index === act.preSceneMusic.length - 1;
            const gapScale = isLast
                ? act.scenes.length > 0 ? MUSIC_TO_SCENE_GAP_SCALE : 0
                : MUSIC_TO_MUSIC_GAP_SCALE;

            cursor.y += geometry.bodyLineHeightPx * gapScale;
        });

        act.scenes.forEach((scene, sceneIndex) => {
            const isLastScene = sceneIndex === act.scenes.length - 1;
            const hasNestedMusic = plan.variant === 'scenes-and-musical-numbers' && scene.music.length > 0;

            pushSceneLine(cursor, geometry, heading, scene, hasNestedMusic, pageNumbers);

            if (!hasNestedMusic) {
                if (!isLastScene) {
                    cursor.y += geometry.bodyLineHeightPx * SCENE_GAP_SCALE;
                }

                return;
            }

            cursor.y += geometry.bodyLineHeightPx * SCENE_TO_MUSIC_GAP_SCALE;
            scene.music.forEach((entry, musicIndex) => {
                pushMusicEntry(cursor, geometry, heading, entry, NESTED_MUSIC_INDENT_CHARS, pageNumbers);

                const isLastMusic = musicIndex === scene.music.length - 1;

                if (!isLastMusic) {
                    cursor.y += geometry.bodyLineHeightPx * MUSIC_TO_MUSIC_GAP_SCALE;
                } else if (!isLastScene) {
                    cursor.y += geometry.bodyLineHeightPx * MUSIC_TO_SCENE_GAP_SCALE;
                }
            });
        });
    });

    return cursor.pages;
};
