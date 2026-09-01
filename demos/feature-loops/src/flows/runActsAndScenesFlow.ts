export type ActsAndScenesFlowDriver = {
    typeHuman: (text: string) => Promise<void>,
    typeBlock: (text: string) => Promise<void>,
    press: (key: string) => Promise<void>,
    pause: (durationMs: number) => Promise<void>,
    addAct: () => Promise<void>,
    waitForSecondAct: () => Promise<void>,
    beginFirstSceneDrag: () => Promise<void>,
    moveFirstSceneOverSecondAct: () => Promise<void>,
    dropScene: () => Promise<void>,
};

export const runActsAndScenesFlow = async (driver: ActsAndScenesFlowDriver): Promise<void> => {
    await driver.pause(600);
    await driver.press('Enter');
    await driver.press('Control+1');
    await driver.typeHuman('THE CONSERVATORY');
    await driver.press('Enter');

    const sceneBodyBlocks = [
        'Vines climb the glass walls.',
        'MARA',
        'The air is warmer here.',
        'JON',
        'Then we have found the right place.',
    ];

    for (const [index, text] of sceneBodyBlocks.entries()) {
        await driver.typeBlock(text);

        if (index < sceneBodyBlocks.length - 1) {
            await driver.pause(280);
            await driver.press('Enter');
        }
    }

    await driver.pause(1_000);
    await driver.addAct();
    await driver.waitForSecondAct();
    await driver.pause(600);
    await driver.beginFirstSceneDrag();
    await driver.moveFirstSceneOverSecondAct();
    await driver.pause(500);
    await driver.dropScene();
    await driver.pause(2_600);
};
