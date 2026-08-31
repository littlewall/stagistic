export type EditorBlocksFlowDriver = {
    typeWordGroups: (groups: readonly string[]) => Promise<void>,
    typeHuman: (text: string) => Promise<void>,
    press: (key: string) => Promise<void>,
    pause: (durationMs: number) => Promise<void>,
    moveToBlock: (blockId: string) => Promise<void>,
    waitForSuggestions: () => Promise<void>,
    waitForMusicPill: () => Promise<void>,
};

export const runEditorBlocksFlow = async (driver: EditorBlocksFlowDriver): Promise<void> => {
    await driver.typeWordGroups(['THE', ' ROOFTOP']);
    await driver.moveToBlock('demo-stage-direction-1');
    await driver.typeWordGroups(['A storm gathers', ' over the silent city.']);
    await driver.moveToBlock('demo-character-block-1');

    await driver.typeHuman('MAR');
    await driver.waitForSuggestions();
    await driver.pause(280);
    await driver.press('ArrowDown');
    await driver.pause(180);
    await driver.press('Enter');
    await driver.moveToBlock('demo-dialogue');
    await driver.typeHuman('Wait. The storm is almost here.');
    await driver.moveToBlock('demo-character-block-2');

    await driver.typeHuman('EL');
    await driver.waitForSuggestions();
    await driver.pause(280);
    await driver.press('ArrowDown');
    await driver.pause(180);
    await driver.press('Enter');
    await driver.moveToBlock('demo-aside');
    await driver.pause(300);
    await driver.typeWordGroups(['softly']);
    await driver.pause(120);
    await driver.moveToBlock('demo-lyrics');
    await driver.typeHuman('WE RISE');
    await driver.moveToBlock('demo-lyrics-2');
    await driver.typeHuman('WITH THE DAWN');
    await driver.moveToBlock('demo-stage-direction-2');

    await driver.typeWordGroups(['First light spills', ' over the rooftop.']);
    await driver.typeWordGroups(['#']);
    await driver.typeHuman('Dawn in Gold');
    await driver.press('Enter');
    await driver.waitForMusicPill();
    await driver.pause(1_400);
};
