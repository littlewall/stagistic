import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {settingsRescueText, titlePageRescueText} from './draftRescueText';

describe('rescue text of a draft', () => {
    it('writes the title page as readable lines without JSON', () => {
        const text = titlePageRescueText({
            subtitle: 'A play',
            credits: [{credit: 'Written by', authors: ['Anna', 'Bo']}, {credit: 'Translated by', authors: ['']}],
            contact: 'anna@example.com',
            draftDateMode: 'auto',
        });

        expect(text).toBe([
            'Title page',
            'Subtitle: A play',
            'Written by: Anna, Bo',
            'Contact: anna@example.com',
        ].join('\n'));
        expect(text).not.toContain('{');
    });

    it('writes settings as one readable line per value', () => {
        const text = settingsRescueText({page: {size: 'a4', margins: {top: 20}}, structure: {showActs: true}} as never);

        expect(text).toBe([
            'Settings',
            'page.size: a4',
            'page.margins.top: 20',
            'structure.showActs: true',
        ].join('\n'));
        expect(text).not.toContain('{');
    });
});
