import type {Page} from 'playwright';

import type {CharactersAttributesFlowDriver} from './runCharactersAttributesFlow';

const HUMAN_KEY_PAUSES_MS = [
    48,
    62,
    44,
    57,
    51,
    66,
] as const;

type PlaywrightCharactersAttributesPage = Pick<
    Page,
    'keyboard' | 'waitForTimeout' | 'getByPlaceholder' | 'getByRole' | 'locator'
>;

export const createPlaywrightCharactersAttributesDriver = (
    page: PlaywrightCharactersAttributesPage,
): CharactersAttributesFlowDriver => {
    const membersInput = page.getByPlaceholder('Select members');

    return {
        focusMembers: () => membersInput.focus(),
        typeHuman: async text => {
            for (const [index, character] of Array.from(text).entries()) {
                await page.keyboard.type(character);
                await page.waitForTimeout(HUMAN_KEY_PAUSES_MS[index % HUMAN_KEY_PAUSES_MS.length] ?? 50);
            }
        },
        selectMember: name => page.locator('[data-testid="suggestions"] li')
            .getByText(name, {exact: true})
            .click(),
        openColorPicker: () => page.getByRole('region', {name: 'Groups detail'})
            .getByRole('button', {name: 'Choose color for THE WATCH'})
            .click(),
        selectColorPreset: index => page.getByRole(
            'button',
            {name: `Select preset color ${index}`},
        ).click(),
        applyColor: () => page.getByRole('button', {name: 'Apply', exact: true}).click(),
        pause: durationMs => page.waitForTimeout(durationMs),
    };
};
