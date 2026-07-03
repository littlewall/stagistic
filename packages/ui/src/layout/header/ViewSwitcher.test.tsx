import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {ViewSwitcher, VIEW_SWITCHER_ITEMS} from './ViewSwitcher';

describe('VIEW_SWITCHER_ITEMS', () => {
    it('lists editor then export', () => {
        expect(VIEW_SWITCHER_ITEMS.map(item => item.view)).toEqual(['editor', 'export']);
    });
});

describe('ViewSwitcher', () => {
    it('marks the active view as selected and others as not', () => {
        const markup = renderToStaticMarkup(
            <ViewSwitcher activeView="export" onSelectView={() => {}} />,
        );

        expect(markup).toContain('Editor');
        expect(markup).toContain('Export');
        expect(markup).toContain('aria-pressed="true"');
    });
});
