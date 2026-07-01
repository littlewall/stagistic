import {createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ContextMenu} from './ContextMenu';

describe('ContextMenu', () => {
    it('renders command details separately while preserving the accessible label', () => {
        const html = renderToStaticMarkup(
            <ContextMenu
                ariaLabel="Block actions"
                items={[
                    {
                        kind: 'command',
                        id: 'add-cue',
                        label: 'Add cue',
                        detail: '(1.A)',
                        icon: null,
                    },
                ]}
                isMenuAbove={false}
                menuRef={createRef<HTMLDivElement>()}
                menuStyle={undefined}
                positionClassName=""
                rootDataAttributes={{}}
            />,
        );

        expect(html).toContain('aria-label="Add cue (1.A)"');
        expect(html).toContain('>Add cue</span><span');
        expect(html).toContain('>(1.A)</span>');
    });
});
