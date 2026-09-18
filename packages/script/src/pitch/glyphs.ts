import {
    BRAVURA_G_CLEF_8VB_PATH,
    BRAVURA_G_CLEF_8VB_VIEWBOX,
    BRAVURA_G_CLEF_PATH,
    BRAVURA_G_CLEF_VIEWBOX,
} from './bravuraGlyphData';
import type {Clef} from './types';

export type GlyphCommand =
    | {
        c: 'M', x: number, y: number,
    }
    | {
        c: 'L', x: number, y: number,
    }
    | {
        c: 'C', x1: number, y1: number, x2: number, y2: number, x: number, y: number,
    }
    | {
        c: 'Z',
    };

export interface Glyph {
    commands: GlyphCommand[],
    paint: 'fill' | 'stroke',
    viewBox: {width: number, height: number},
}

export const pathToSvgD = (commands: GlyphCommand[]): string => commands
    .map(command => {
        if (command.c === 'M') {
            return `M${command.x} ${command.y}`;
        }

        if (command.c === 'L') {
            return `L${command.x} ${command.y}`;
        }

        if (command.c === 'C') {
            return `C${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;
        }

        return 'Z';
    })
    .join(' ');

const parseGlyphPath = (path: string): GlyphCommand[] => {
    const tokens = path.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
    const commands: GlyphCommand[] = [];
    let cursor = 0;

    const readNumbers = <Length extends number>(length: Length): number[] => {
        const values = tokens.slice(cursor, cursor + length).map(Number);

        cursor += length;

        if (values.length !== length || values.some(value => !Number.isFinite(value))) {
            throw new Error('Invalid Bravura glyph path');
        }

        return values;
    };

    while (cursor < tokens.length) {
        const command = tokens[cursor++];

        if (command === 'M' || command === 'L') {
            const [x, y] = readNumbers(2) as [number, number];

            commands.push({
                c: command, x, y,
            });

            continue;
        }

        if (command === 'C') {
            const [
                x1,
                y1,
                x2,
                y2,
                x,
                y,
            ] = readNumbers(6) as [number, number, number, number, number, number];

            commands.push({
                c: command, x1, y1, x2, y2, x, y,
            });

            continue;
        }

        if (command === 'Z') {
            commands.push({c: command});

            continue;
        }

        throw new Error(`Unsupported Bravura glyph command: ${command ?? 'missing'}`);
    }

    return commands;
};

export const CLEF_GLYPHS: Record<Clef, Glyph> = {
    treble: {
        commands: parseGlyphPath(BRAVURA_G_CLEF_PATH),
        paint: 'fill',
        viewBox: BRAVURA_G_CLEF_VIEWBOX,
    },
    'treble-8vb': {
        commands: parseGlyphPath(BRAVURA_G_CLEF_8VB_PATH),
        paint: 'fill',
        viewBox: BRAVURA_G_CLEF_8VB_VIEWBOX,
    },
};

/** Sharp: two parallel slanted verticals crossed by two parallel slanted horizontals. */
const SHARP_COMMANDS: GlyphCommand[] = [
    {
        c: 'M', x: 3, y: 1,
    },
    {
        c: 'L', x: 2, y: 19,
    },
    {
        c: 'M', x: 7, y: 1,
    },
    {
        c: 'L', x: 6, y: 19,
    },
    {
        c: 'M', x: 1, y: 7,
    },
    {
        c: 'L', x: 9, y: 5,
    },
    {
        c: 'M', x: 1, y: 15,
    },
    {
        c: 'L', x: 9, y: 13,
    },
];

/** Flat: a vertical stem with a rounded bowl attached partway down. */
const FLAT_COMMANDS: GlyphCommand[] = [
    {
        c: 'M', x: 2, y: 1,
    },
    {
        c: 'L', x: 2, y: 17,
    },
    {
        c: 'M', x: 2, y: 9,
    },
    {
        c: 'C', x1: 5.5, y1: 8.5, x2: 8, y2: 10, x: 8, y: 12.5,
    },
    {
        c: 'C', x1: 8, y1: 15, x2: 4.5, y2: 17, x: 2, y: 16,
    },
];

export const ACCIDENTAL_GLYPHS: Record<'sharp' | 'flat', Glyph> = {
    sharp: {
        commands: SHARP_COMMANDS,
        paint: 'stroke',
        viewBox: {width: 10, height: 20},
    },
    flat: {
        commands: FLAT_COMMANDS,
        paint: 'stroke',
        viewBox: {width: 10, height: 20},
    },
};
