import {expect, it} from 'vite-plus/test';

import {normalizeBlockSegments} from './textSegments';

it('wraps a formatted stage direction for PDF without changing its text segments', () => {
    const segments = [{text: 'She exits.', style: {}}];
    const result = normalizeBlockSegments(segments, 'stageDirection', 'normal', true);

    expect(result.map(segment => segment.text).join('')).toBe('(She exits.)');
    expect(segments[0].text).toBe('She exits.');
});
