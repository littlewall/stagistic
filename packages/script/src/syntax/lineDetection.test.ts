import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    isForcedCharacterCueLine,
    isQuotedCharacterCueLine,
    isUppercaseSyntaxLine,
    shouldForceStageDirection,
} from './lineDetection';

describe('Stagistic line detection', () => {
    it('treats uppercase lines exactly, without a length heuristic', () => {
        expect(isUppercaseSyntaxLine('ANNA')).toBe(true);
        expect(isUppercaseSyntaxLine('VŠECHNA SVĚTLA NÁHLE ZHASNOU A JEVIŠTĚ ZŮSTANE POTMĚ.')).toBe(true);
        expect(isUppercaseSyntaxLine('Anna enters')).toBe(false);
        expect(isUppercaseSyntaxLine('123')).toBe(false);
    });

    it('recognizes only complete forced character cue lines', () => {
        expect(isForcedCharacterCueLine('@MICHAEL')).toBe(true);
        expect(isForcedCharacterCueLine('@Anna / Petr')).toBe(true);
        expect(isForcedCharacterCueLine('@"Mrs. Washington"')).toBe(true);
        expect(isForcedCharacterCueLine('@Michael enters')).toBe(false);
        expect(isQuotedCharacterCueLine('"Mrs. Washington"')).toBe(true);
        expect(isQuotedCharacterCueLine('"Mrs. Washington" enters')).toBe(false);
    });

    it('forces stage directions that collide with another block detector', () => {
        expect(shouldForceStageDirection('ALL LIGHTS OUT')).toBe(true);
        expect(shouldForceStageDirection('@MICHAEL')).toBe(true);
        expect(shouldForceStageDirection('# Not a scene')).toBe(true);
        expect(shouldForceStageDirection('[[ literal note ]]')).toBe(true);
        expect(shouldForceStageDirection('!BANG')).toBe(true);
        expect(shouldForceStageDirection('"A quoted direction"')).toBe(true);
        expect(shouldForceStageDirection('@Michael enters')).toBe(false);
        expect(shouldForceStageDirection('Michael enters')).toBe(false);
    });
});
