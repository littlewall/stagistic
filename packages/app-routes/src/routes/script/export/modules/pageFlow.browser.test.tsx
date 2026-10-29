import '@stagistic/ui/styles/base.css';

import {BASIC_DEFAULTS} from '@stagistic/export';
import {getFormatTemplate} from '@stagistic/script';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vite-plus/test';

import {FormatTemplateContext} from '../../settings/template/FormatTemplateContext';
import {PageBreakModule} from './PageBreakModule';

it('keeps all export flow choices editable under a block template lock', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);

    root.render(
        <FormatTemplateContext.Provider
            value={{
                template: getFormatTemplate('samuel-french'),
                change: () => {

                },
                resetToDefault: () => {},
                unlock: () => {},
            }}
        ><PageBreakModule value={{...BASIC_DEFAULTS.pageBreaks, continuationMark: 'cont'}} onChange={() => {}} />
        </FormatTemplateContext.Provider>,
    );
    try {
        await expect.poll(() => host.querySelector('button[aria-label="Continuation mark"]')).toBeTruthy();
        expect(host.querySelector('button[aria-label="Continuation mark"]')?.matches(':disabled')).toBe(false);
        expect(host.querySelector('button[aria-label="Continuation mark"]')?.textContent).toContain('(Cont.)');

        const switches = Array.from(host.querySelectorAll<HTMLInputElement>('input[role="switch"]'));

        expect(switches.filter(input => input.disabled)).toHaveLength(0);
        expect(switches.find(input => input.closest('label')?.textContent?.includes('odd pages'))?.disabled).toBe(false);
        expect(host.querySelector('button[aria-label="Edit format"]')).toBeNull();
    } finally {
        root.unmount();
        host.remove();
    }
});
