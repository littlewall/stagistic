import type {Page} from 'playwright';

import {createPlaywrightEditorBlocksDriver} from './createPlaywrightEditorBlocksDriver';
import type {CharactersEditorFlowDriver} from './runCharactersEditorFlow';

type PlaywrightCharactersEditorPage = Pick<
    Page,
    'keyboard' | 'waitForTimeout' | 'evaluate' | 'locator' | 'getByRole'
>;

export const createPlaywrightCharactersEditorDriver = (
    page: PlaywrightCharactersEditorPage,
): CharactersEditorFlowDriver => ({
    ...createPlaywrightEditorBlocksDriver(page),
    confirmUnconfirmedCharacter: async characterKey => {
        const confirmButton = page.getByRole('button', {name: `Confirm ${characterKey}`});

        await confirmButton.waitFor({state: 'visible'});
        await confirmButton.click();
        await page.getByRole('button', {name: `Manage ${characterKey}`}).waitFor({state: 'visible'});
    },
});
