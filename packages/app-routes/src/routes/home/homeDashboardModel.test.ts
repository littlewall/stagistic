import type {ScriptSummary} from '@stagistic/app-core';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildHomeDashboardModel} from './homeDashboardModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-02T12:00:00Z').getTime();

const script = (
    id: string,
    title: string,
    daysAgo: number,
    subtitle: string | null = null,
): ScriptSummary => ({
    id,
    title,
    subtitle,
    createdAt: NOW - daysAgo * DAY_MS,
    updatedAt: NOW - daysAgo * DAY_MS,
    activeBlockId: null,
});

const scripts = [
    script('recent', 'Beta', 2, 'Moonlight'),
    script('month', 'Alpha', 20),
    script('old', 'Gamma', 45),
];

describe('buildHomeDashboardModel', () => {
    it('builds time-based sections', () => {
        const model = buildHomeDashboardModel({
            scripts, query: '', sort: 'newest', now: NOW,
        });

        expect(model.continueWriting.map(item => item.id)).toEqual(['recent']);
        expect(model.recentlyEdited.map(item => item.id)).toEqual(['month']);
        expect(model.allScripts.map(item => item.id)).toEqual([
            'recent',
            'month',
            'old',
        ]);
    });

    it('searches title and subtitle case-insensitively', () => {
        const byTitle = buildHomeDashboardModel({
            scripts, query: 'alpha', sort: 'newest', now: NOW,
        });
        const bySubtitle = buildHomeDashboardModel({
            scripts, query: 'MOON', sort: 'newest', now: NOW,
        });

        expect(byTitle.allScripts.map(item => item.id)).toEqual(['month']);
        expect(bySubtitle.allScripts.map(item => item.id)).toEqual(['recent']);
    });

    it('sorts all scripts alphabetically without changing recent sections', () => {
        const model = buildHomeDashboardModel({
            scripts, query: '', sort: 'title', now: NOW,
        });

        expect(model.allScripts.map(item => item.title)).toEqual([
            'Alpha',
            'Beta',
            'Gamma',
        ]);
        expect(model.recentlyEdited.map(item => item.title)).toEqual(['Alpha']);
    });
});
