import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ToggleButtonGroup} from './ToggleButtonGroup';

describe('ToggleButtonGroup', () => {
    it('renders text and icon content with the selected value', () => {
        const markup = renderToStaticMarkup(
            <ToggleButtonGroup
                ariaLabel="Example"
                options={[
                    {value: 'text', label: 'Text'}, {
                        value: 'icon', label: 'Icon', content: <span data-icon="true">I</span>, isIconOnly: true,
                    },
                ]}
                value="icon"
                onChange={() => {}}
            />,
        );

        expect(markup).toContain('aria-label="Example"');
        expect(markup).toContain('aria-label="Icon"');
        expect(markup).toContain('aria-checked="true"');
        expect(markup).toContain('data-icon="true"');
        expect(markup).toContain('Text');
    });

    it('supports multiple selected values', () => {
        const markup = renderToStaticMarkup(
            <ToggleButtonGroup
                ariaLabel="Formatting"
                options={[{value: 'bold', label: 'Bold'}, {value: 'italic', label: 'Italic'}]}
                selectionMode="multiple"
                value={['bold', 'italic']}
                onChange={() => {}}
            />,
        );

        expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2);
    });
});
