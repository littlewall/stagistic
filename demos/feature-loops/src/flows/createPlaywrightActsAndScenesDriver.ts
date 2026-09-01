import type {
    Locator,
    Page,
} from 'playwright';

import type {ActsAndScenesFlowDriver} from './runActsAndScenesFlow';

type PlaywrightActsAndScenesPage = Pick<
    Page,
    'keyboard' | 'waitForTimeout' | 'getByRole' | 'locator' | 'mouse'
>;

const SECOND_ACT_SELECTOR = '[data-structure-act-id]';
const HUMAN_KEY_PAUSES_MS = [
    48,
    62,
    44,
    57,
    51,
    66,
] as const;

type Point = {
    x: number,
    y: number,
};

const getCenter = async (locator: Locator, label: string) => {
    const box = await locator.boundingBox();

    if (!box) {
        throw new Error(`Could not find ${label} for the acts and scenes demo.`);
    }

    return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
    };
};

const getMidpointX = (start: Point, end: Point): number => (start.x + end.x) / 2;

export const createPlaywrightActsAndScenesDriver = (
    page: PlaywrightActsAndScenesPage,
): ActsAndScenesFlowDriver => {
    let firstSceneDragStart: Point | null = null;

    return {
        typeHuman: async text => {
            for (const [index, character] of Array.from(text).entries()) {
                await page.keyboard.type(character);
                await page.waitForTimeout(HUMAN_KEY_PAUSES_MS[index % HUMAN_KEY_PAUSES_MS.length] ?? 50);
            }
        },
        typeBlock: text => page.keyboard.insertText(text),
        press: key => page.keyboard.press(key),
        pause: durationMs => page.waitForTimeout(durationMs),
        addAct: () => page.getByRole('button', {name: 'Add act'}).click(),
        waitForSecondAct: () => page.locator(SECOND_ACT_SELECTOR).nth(1).waitFor({state: 'visible'}),
        beginFirstSceneDrag: async () => {
            const firstSceneHandle = page.getByRole('button', {name: 'Drag scene'}).first();
            const center = await getCenter(firstSceneHandle, 'first scene drag handle');

            firstSceneDragStart = center;
            await page.mouse.move(center.x, center.y);
            await page.mouse.down();
        },
        moveFirstSceneOverSecondAct: async () => {
            if (!firstSceneDragStart) {
                throw new Error('Could not continue the scene drag before it started.');
            }

            const secondAct = page.locator(SECOND_ACT_SELECTOR).nth(1);
            const center = await getCenter(secondAct, 'second act row');

            await page.mouse.move(getMidpointX(firstSceneDragStart, center), center.y, {steps: 12});
        },
        dropScene: () => page.mouse.up(),
    };
};
