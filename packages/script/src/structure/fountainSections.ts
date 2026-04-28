import type {StructureSettings} from '../settings';
import type {MusicType} from './model';
import {resolveStructureSettings} from './shared';

const DEFAULT_STRUCTURE_SETTINGS = resolveStructureSettings();

export type DetectedSectionMarker =
    | {
        kind: 'act',
        name: string,
        rawLine: string,
    }
    | {
        kind: 'music-start',
        musicType: MusicType,
        name: string,
        rawLine: string,
    }
    | {
        kind: 'music-end',
        musicType: MusicType,
        name: string,
        rawLine: string,
    }
    | {
        kind: 'unknown-section',
        depth: 1 | 2,
        rawLine: string,
    };

const normalizePrefix = (value: unknown) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const uniquePrefixes = (values: string[]) => {
    const unique = new Set<string>();

    values.forEach(value => {
        const normalized = normalizePrefix(value);

        if (!normalized) {
            return;
        }

        unique.add(normalized);
    });

    return Array.from(unique);
};

const extractNameByPrefix = (body: string, prefix: string) => {
    if (body.length < prefix.length) {
        return null;
    }

    const head = body.slice(0, prefix.length);

    if (head.toUpperCase() !== prefix.toUpperCase()) {
        return null;
    }

    return body.slice(prefix.length).trimStart();
};

const matchByPrefixes = (body: string, prefixes: string[]) => {
    for (const prefix of prefixes) {
        const name = extractNameByPrefix(body, prefix);

        if (name === null) {
            continue;
        }

        return {
            prefix,
            name,
        };
    }

    return null;
};

type DetectSectionMarkerOptions = {
    settings?: Partial<StructureSettings>,
};

export const detectSectionMarker = (
    line: string,
    options?: DetectSectionMarkerOptions,
): DetectedSectionMarker | null => {
    const trimmed = line.trim();

    if (!trimmed.startsWith('#')) {
        return null;
    }

    const match = (/^(#{1,2})\s*(.+?)\s*$/).exec(trimmed);

    if (!match) {
        return null;
    }

    const depth = match[1].length as 1 | 2;
    const body = match[2].trim();
    const settings = resolveStructureSettings(options?.settings);
    const actPrefixes = uniquePrefixes([settings.actPrefix, DEFAULT_STRUCTURE_SETTINGS.actPrefix]);

    if (depth === 1) {
        const actMatch = matchByPrefixes(body, actPrefixes);

        if (actMatch) {
            return {
                kind: 'act',
                name: actMatch.name,
                rawLine: line,
            };
        }

        return {
            kind: 'unknown-section',
            depth,
            rawLine: line,
        };
    }

    const musicTypes: MusicType[] = [
        'song',
        'reprise',
        'underscore',
    ];

    for (const musicType of musicTypes) {
        const endPrefixes = uniquePrefixes([settings.musicPrefixes[musicType].end, DEFAULT_STRUCTURE_SETTINGS.musicPrefixes[musicType].end]);
        const endMatch = matchByPrefixes(body, endPrefixes);

        if (endMatch) {
            return {
                kind: 'music-end',
                musicType,
                name: endMatch.name,
                rawLine: line,
            };
        }
    }

    for (const musicType of musicTypes) {
        const startPrefixes = uniquePrefixes([settings.musicPrefixes[musicType].start, DEFAULT_STRUCTURE_SETTINGS.musicPrefixes[musicType].start]);
        const startMatch = matchByPrefixes(body, startPrefixes);

        if (startMatch) {
            return {
                kind: 'music-start',
                musicType,
                name: startMatch.name,
                rawLine: line,
            };
        }
    }

    return {
        kind: 'unknown-section',
        depth,
        rawLine: line,
    };
};

const joinPrefixWithName = (prefix: string, name: string) => {
    const normalizedPrefix = normalizePrefix(prefix);
    const normalizedName = name.trim();

    if (!normalizedName) {
        return normalizedPrefix;
    }

    return `${normalizedPrefix} ${normalizedName}`;
};

export const buildActSectionLine = (
    name: string,
    settings?: Partial<StructureSettings>,
) => {
    const resolved = resolveStructureSettings(settings);

    return `# ${joinPrefixWithName(resolved.actPrefix, name)}`;
};

export const buildMusicStartSectionLine = (
    musicType: MusicType,
    name: string,
    settings?: Partial<StructureSettings>,
) => {
    const resolved = resolveStructureSettings(settings);

    return `## ${joinPrefixWithName(resolved.musicPrefixes[musicType].start, name)}`;
};

export const buildMusicEndSectionLine = (
    musicType: MusicType,
    name: string,
    settings?: Partial<StructureSettings>,
) => {
    const resolved = resolveStructureSettings(settings);

    return `## ${joinPrefixWithName(resolved.musicPrefixes[musicType].end, name)}`;
};
