import type {Page} from 'playwright';

import type {EditorBlocksFlowDriver} from './runEditorBlocksFlow';

const WORD_GROUP_PAUSE_MS = 110;
const HUMAN_KEY_PAUSES_MS = [48, 62, 44, 57, 51, 66] as const;

type PlaywrightEditorBlocksPage = Pick<Page, 'keyboard' | 'waitForTimeout' | 'locator' | 'getByRole'>;

const waitForVisible = async (page: PlaywrightEditorBlocksPage, selector: string) => {
    await page.locator(selector).last().waitFor({state: 'visible'});
};

export const createPlaywrightEditorBlocksDriver = (
    page: PlaywrightEditorBlocksPage,
): EditorBlocksFlowDriver => ({
    typeWordGroups: async groups => {
        for (const [index, group] of groups.entries()) {
            await page.keyboard.insertText(group);

            if (index < groups.length - 1) {
                await page.waitForTimeout(WORD_GROUP_PAUSE_MS);
            }
        }
    },
    typeHuman: async text => {
        for (const [index, character] of Array.from(text).entries()) {
            await page.keyboard.type(character);
            await page.waitForTimeout(HUMAN_KEY_PAUSES_MS[index % HUMAN_KEY_PAUSES_MS.length] ?? 50);
        }
    },
    press: key => page.keyboard.press(key),
    pause: durationMs => page.waitForTimeout(durationMs),
    waitForBlock: blockType => waitForVisible(page, `[data-block-type="${blockType}"]`),
    waitForSuggestions: () => page.getByRole('listbox').waitFor({state: 'visible'}),
    waitForMusicPill: () => waitForVisible(page, '[data-music-pill="start"]'),
});
