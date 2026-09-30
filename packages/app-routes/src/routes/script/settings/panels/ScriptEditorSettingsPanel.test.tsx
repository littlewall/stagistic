import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ScriptEditorSettingsPanel} from './ScriptEditorSettingsPanel';
import type {ScriptEditorSettingsPanelProps} from './types';

describe('ScriptEditorSettingsPanel', () => {
    it('renders nothing for an unavailable settings section', () => {
        const props = {
            panelId: 'unavailable-section',
        } as unknown as ScriptEditorSettingsPanelProps;

        expect(renderToStaticMarkup(<ScriptEditorSettingsPanel {...props} />)).toBe('');
    });
});
