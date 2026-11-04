import {requireValue} from '@stagistic/shared';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    createScript,
    findButton,
    mountApp,
    repository,
    waitFor,
} from './boardTestFixtures';

const characterColor = () => [...document.querySelectorAll<HTMLElement>('[aria-label="Characters list"] button')]
    .find(button => button.textContent?.trim() === 'ANNA')
    ?.querySelector<HTMLElement>('span')?.style.backgroundColor;

const pickerAction = async (label: string) => {
    await userEvent.click(requireValue(await waitFor(() => document.querySelector<HTMLElement>('dialog[aria-label="Attribute manager"] [aria-label="Choose color for ANNA"]'))));
    await waitFor(() => document.querySelector('[aria-label="Color picker for ANNA"]'));
    await userEvent.click(requireValue(findButton(label)));
};

it('shows collection colors immediately, rolls back a rejected reset, and persists a new color', async () => {
    const {scriptId, annaId} = await createScript();

    await repository.setScriptCharacterColor(scriptId, annaId, null);
    await mountApp(`/script/${scriptId}/editor`);
    await userEvent.click(requireValue(await waitFor(() => findButton('Open attribute manager'))));
    await waitFor(() => document.querySelector('dialog[aria-label="Attribute manager"]'));
    await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(tab => tab.textContent === 'Characters')));
    await expect.poll(characterColor).toMatch(/^rgb\(/);

    const implicitColor = characterColor();

    await repository.setScriptCharacterColor(scriptId, annaId, '#cc3344');
    await expect.poll(characterColor).toBe('rgb(210, 45, 63)');

    const confirmedColor = (await repository.getScriptCharactersSource(scriptId).read()).find(row => row.id === annaId)?.colorHex;

    let rejectSave: (error: Error) => void = () => undefined;
    const gate = new Promise<never>((_resolve, reject) => {
        rejectSave = reject;
    });
    const save = vi.spyOn(repository, 'setScriptCharacterColor').mockImplementation(() => gate);

    try {
        await pickerAction('Reset');
        await expect.poll(() => save.mock.calls.length).toBe(1);
        await expect.poll(characterColor).toBe(implicitColor);
        expect((await repository.getScriptCharactersSource(scriptId).read()).find(row => row.id === annaId)?.colorHex).toBe(confirmedColor);

        rejectSave(new Error('disk full'));
        await expect.poll(characterColor).toBe('rgb(210, 45, 63)');
        await waitFor(() => document.querySelector('dialog[aria-label="Attribute manager"] [aria-label="Choose color for ANNA"]')?.getAttribute('aria-disabled') !== 'true');
    } finally {
        save.mockRestore();
    }

    await pickerAction('Apply');
    await expect.poll(async () => (await repository.getScriptCharactersSource(scriptId).read()).find(row => row.id === annaId)?.colorHex)
        .not.toBe(confirmedColor);
    await expect.poll(characterColor).not.toBe('rgb(210, 45, 63)');
});
