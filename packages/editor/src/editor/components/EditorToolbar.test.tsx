import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import EditorToolbar from './EditorToolbar';

describe('EditorToolbar', () => {
    it('places block formatting before document search', () => {
        const markup = renderToStaticMarkup(<EditorToolbar editor={null} />);
        const underlineIndex = markup.indexOf('aria-label="Underline"');
        const blockTypeIndex = markup.indexOf('aria-label="Change block type"');
        const searchIndex = markup.indexOf('aria-label="Search script"');

        expect(underlineIndex).toBeGreaterThan(-1);
        expect(blockTypeIndex).toBeGreaterThan(underlineIndex);
        expect(searchIndex).toBeGreaterThan(blockTypeIndex);
    });
});
