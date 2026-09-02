export type CharactersEditorFlowDriver = {
    typeHuman: (text: string) => Promise<void>,
    press: (key: string) => Promise<void>,
    pause: (durationMs: number) => Promise<void>,
    moveToBlock: (blockId: string) => Promise<void>,
    confirmUnconfirmedCharacter: (characterKey: string) => Promise<void>,
    waitForSuggestions: () => Promise<void>,
};

const confirmSuggestedCharacter = async (driver: CharactersEditorFlowDriver): Promise<void> => {
    await driver.waitForSuggestions();
    await driver.pause(280);
    await driver.press('ArrowDown');
    await driver.pause(180);
    await driver.press('Enter');
};

export const runCharactersEditorFlow = async (driver: CharactersEditorFlowDriver): Promise<void> => {
    await driver.moveToBlock('demo-characters-unconfirmed');
    await driver.typeHuman('WARDEN');
    await driver.moveToBlock('demo-characters-warden-dialogue');
    await driver.typeHuman('The gate is secure.');
    await driver.confirmUnconfirmedCharacter('WARDEN');
    await driver.pause(650);

    await driver.moveToBlock('demo-characters-mara');
    await driver.typeHuman('MAR');
    await confirmSuggestedCharacter(driver);

    await driver.moveToBlock('demo-characters-mara-dialogue');
    await driver.typeHuman('Keep the beacon lit.');

    await driver.moveToBlock('demo-characters-together');
    await driver.typeHuman('MAR');
    await confirmSuggestedCharacter(driver);
    await driver.typeHuman('/');
    await driver.typeHuman('EL');
    await confirmSuggestedCharacter(driver);

    await driver.moveToBlock('demo-characters-together-dialogue');
    await driver.typeHuman('Together, we hold the line.');

    await driver.moveToBlock('demo-characters-watch');
    await driver.typeHuman('THE');
    await confirmSuggestedCharacter(driver);
    await driver.moveToBlock('demo-characters-watch-dialogue');
    await driver.typeHuman('We stand watch until dawn.');

    await driver.moveToBlock('demo-characters-tagged-direction');
    await driver.typeHuman('@MAR');
    await confirmSuggestedCharacter(driver);
    await driver.pause(180);
    await driver.press('Enter');
    await driver.typeHuman('seals the observatory doors.');
    await driver.pause(1_400);
};
