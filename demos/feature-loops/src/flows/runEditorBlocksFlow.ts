export type EditorBlocksFlowDriver = {
    typeWordGroups: (groups: readonly string[]) => Promise<void>,
    typeHuman: (text: string) => Promise<void>,
    press: (key: string) => Promise<void>,
    pause: (durationMs: number) => Promise<void>,
    waitForBlock: (blockType: string) => Promise<void>,
    waitForSuggestions: () => Promise<void>,
    waitForMusicPill: () => Promise<void>,
};

export const runEditorBlocksFlow = async (driver: EditorBlocksFlowDriver): Promise<void> => {
    await driver.typeWordGroups(['THE', ' ROOFTOP']);
    await driver.press('Enter');
    await driver.waitForBlock('stageDirection');
    await driver.typeWordGroups(['A storm', ' gathers.']);
    await driver.press('Enter');
    await driver.press('Alt+Enter');
    await driver.waitForBlock('character');

    await driver.typeHuman('MAR');
    await driver.waitForSuggestions();
    await driver.pause(280);
    await driver.press('ArrowDown');
    await driver.pause(180);
    await driver.press('Enter');
    await driver.press('Enter');
    await driver.waitForBlock('dialogue');
    await driver.typeHuman('Wait.');
    await driver.press('Enter');
    await driver.waitForBlock('character');

    await driver.typeHuman('EL');
    await driver.waitForSuggestions();
    await driver.pause(280);
    await driver.press('ArrowDown');
    await driver.pause(180);
    await driver.press('Enter');
    await driver.press('Enter');
    await driver.waitForBlock('dialogue');
    await driver.press('Control+4');
    await driver.waitForBlock('aside');
    await driver.typeHuman('(softly)');
    await driver.press('Enter');
    await driver.waitForBlock('dialogue');
    await driver.press('Control+7');
    await driver.waitForBlock('lyrics');
    await driver.typeHuman('WE RISE');
    await driver.press('Enter');
    await driver.waitForBlock('lyrics');
    await driver.press('Control+2');
    await driver.waitForBlock('stageDirection');

    await driver.typeWordGroups(['The light', ' spills.']);
    await driver.typeWordGroups(['#']);
    await driver.typeHuman('Dawn');
    await driver.press('Enter');
    await driver.waitForMusicPill();
    await driver.pause(1_400);
};
