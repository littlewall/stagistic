import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseStagistic} from '../parsing';
import {serializeStagisticUnits} from './serializeStagistic';

describe('Stagistic serialization units', () => {
    it('keeps a scene heading in its act context', () => {
        const {document} = parseStagistic('# Act One\n\n## Kitchen\n\nA chair.');
        const units = serializeStagisticUnits(document);

        expect(units.find(unit => unit.text.includes('Kitchen'))?.text).toBe('## Kitchen');
    });

    it('keeps a multi-speaker speech and its intermediate direction together', () => {
        const {document} = parseStagistic('@ALICE / BOB\nHello.\n!They sit.\nAgain.');
        const units = serializeStagisticUnits(document);

        expect(units).toHaveLength(1);
        expect(units[0].kind).toBe('speech');
        expect(units[0].text).toContain('ALICE / BOB\nHello.\n!They sit.\nAgain.');
    });
});
