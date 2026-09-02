export type CharactersAttributesFlowDriver = {
    focusMembers: () => Promise<void>,
    typeHuman: (text: string) => Promise<void>,
    selectMember: (name: string) => Promise<void>,
    openColorPicker: () => Promise<void>,
    selectColorPreset: (index: number) => Promise<void>,
    applyColor: () => Promise<void>,
    pause: (durationMs: number) => Promise<void>,
};

const addMember = async (
    driver: CharactersAttributesFlowDriver,
    query: string,
    name: string,
    settleDurationMs: number,
): Promise<void> => {
    await driver.focusMembers();
    await driver.typeHuman(query);
    await driver.pause(320);
    await driver.selectMember(name);
    await driver.pause(settleDurationMs);
};

export const runCharactersAttributesFlow = async (
    driver: CharactersAttributesFlowDriver,
): Promise<void> => {
    await addMember(driver, 'MAR', 'MARA', 260);
    await addMember(driver, 'EL', 'ELI', 320);
    await driver.openColorPicker();
    await driver.pause(380);
    await driver.selectColorPreset(1);
    await driver.pause(240);
    await driver.applyColor();
    await driver.pause(1_400);
};
