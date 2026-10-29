import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Harness, makeRepository} from './__tests__/templateHarness';

let root: Root | null = null;

afterEach(async () => {
    for (const dismiss of document.querySelectorAll<HTMLButtonElement>('[aria-label="Dismiss notification"]')) {
        await userEvent.click(dismiss);
    }

    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const findButton = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(element => element.getAttribute('aria-label') === name || element.textContent?.trim() === name);
const button = (name: string) => requireValue(findButton(name));
const click = async (name: string) => {
    await expect.poll(() => findButton(name)).toBeTruthy();
    await userEvent.click(button(name));
};
const findByRole = (role: string, name: string) => Array.from(document.querySelectorAll<HTMLElement>(`[role="${role}"]`))
    .find(item => item.textContent?.trim() === name || item.textContent?.trim().startsWith(name));
const clickRole = async (role: string, name: string) => {
    await expect.poll(() => findByRole(role, name)).toBeTruthy();
    await userEvent.click(requireValue(findByRole(role, name)));
};
const choose = async (value: string) => {
    await click('Format template');
    await clickRole('option', value);
};
/** Opens the picker from "Choose template…" and previews a template in it. */
const pick = async (label: string) => {
    await choose('Choose template…');
    await clickRole('tab', label);
};
const editFormat = async (action: string) => {
    await click('Edit format');
    await clickRole('menuitem', action);
};

it('applies, locks and unlocks a format while keeping Typing editable', async () => {
    const repository = makeRepository();
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await pick('Dramatists Guild — Modern');
    await click('Use Dramatists Guild — Modern');
    await expect.poll(() => repository.rows()[0]?.formatTemplateId).toBe('dg-modern');
    await expect.poll(() => document.querySelector('[aria-label="Notifications"]')?.textContent).toContain('Dramatists Guild — Modern');
    expect(document.querySelector('dialog[aria-label="Choose format template"]')).toBeNull();
    await expect.poll(() => button('Select page size')?.matches(':disabled')).toBe(false);
    expect(document.querySelector('[data-testid="indent"]')?.textContent).toBe('25');
    await click('Block panel');
    expect(button('Select block shortcut').matches(':disabled')).toBe(false);
    expect(button('Select spacing before').matches(':disabled')).toBe(true);
    await editFormat('Unlock to edit');
    await click('Unlock template');
    await expect.poll(() => repository.rows()[0]?.formatTemplateId).toBeNull();
    expect(repository.rows()[0]?.settings.blocks?.character?.indentLeftChars).toBe(25);
    expect(repository.rows()[0]?.settings.blocks?.character?.shortcut).toBe('5');
    expect(button('Select spacing before').matches(':disabled')).toBe(false);
    expect(button('Format template').textContent).toContain('Custom');
});

it('resets the whole format and recognizes manually restored default values', async () => {
    const repository = makeRepository();
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await choose('Reset to Stagistic Default');
    await click('Reset to Stagistic Default');
    await expect.poll(() => document.querySelector('[data-testid="indent"]')?.textContent).toBe('20');
    expect(repository.rows()[0]?.formatTemplateId).toBeNull();
    expect(button('Format template').textContent).toContain('Stagistic Default');
    await click('Format template');
    expect(Array.from(document.querySelectorAll('[role="option"]')).map(item => item.textContent)).toEqual([
        'Stagistic Default',
        'Choose template…',
    ]);
    await userEvent.keyboard('{Escape}');
    await click('Page panel');
    await click('Select page size');
    await clickRole('option', 'US Letter');
    await expect.poll(() => button('Format template').textContent).toContain('Stagistic Default');
    await click('Format template');
    expect(findByRole('option', 'Reset to Stagistic Default')).toBeUndefined();
    await userEvent.keyboard('{Escape}');
    await click('Select page size');
    await clickRole('option', 'A4');
    await expect.poll(() => button('Format template').textContent).toContain('Stagistic Default');
    await choose('Choose template…');
    expect(findByRole('tab', 'Stagistic Default')?.textContent).toContain('Stagistic Default (current)');
    await click('Cancel');
});

it('resets only the current block including Typing and hides the action at defaults', async () => {
    const repository = makeRepository({blocks: {
        character: {
            indentLeftChars: 25,
            shortcut: '5',
            nextElement: 'aside',
        },
        dialogue: {indentLeftChars: 0},
    }});
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await click('Block panel');
    await click('Reset block settings');
    await expect.poll(() => document.querySelector('[data-testid="indent"]')?.textContent).toBe('20');
    expect(findButton('Reset block settings')).toBeUndefined();
    expect(button('Select block shortcut').textContent).toContain('3');
    expect(button('Select next element').textContent).toContain('Dialogue');
    await expect.poll(() => repository.rows()[0]?.settings.blocks?.character).toBeUndefined();
    expect(repository.rows()[0]?.settings.blocks?.dialogue?.indentLeftChars).toBe(0);
});

it('keeps all header/footer cells editable under a block lock', async () => {
    const repository = makeRepository();
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await pick('Dramatists Guild — Modern');
    await click('Use Dramatists Guild — Modern');
    await expect.poll(() => repository.rows()[0]?.formatTemplateId).toBe('dg-modern');
    await click('Header panel');
    expect(button('Edit right header').matches(':disabled')).toBe(false);
    expect(button('Edit left header').matches(':disabled')).toBe(false);
    await click('Edit left header');
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Header or footer content"]')?.disabled).toBe(false);
});

it('applies a custom copy without a lock and retains exact template line height', async () => {
    const repository = makeRepository();
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await pick('Sketch Comedy — Sketchworks');
    await expect.poll(() => document.querySelector('[role="switch"]')).toBeTruthy();
    await userEvent.click(requireValue(requireValue(document.querySelector('[role="switch"]')).closest('label')));
    await click('Use Sketch Comedy — Sketchworks');
    await expect.poll(() => repository.rows()[0]?.settings.typography?.lineHeight).toBe(1.2);
    expect(repository.rows()[0]?.formatTemplateId).toBeNull();
    expect(repository.rows()[0]?.settings.blocks?.character?.lineHeight).toBe(1.13);
    expect(button('Format template').textContent).toContain('Custom');
});

it('shows the applied format read-only and opens the picker to change it', async () => {
    const repository = makeRepository();
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await click('Format template');
    await expect.poll(() => findByRole('option', 'Choose template…')).toBeTruthy();
    expect(Array.from(document.querySelectorAll('[role="option"]')).map(item => item.textContent)).toEqual([
        'Custom',
        'Reset to Stagistic Default',
        'Choose template…',
    ]);

    const current = requireValue(findByRole('option', 'Custom'));

    expect(current.getAttribute('aria-disabled')).toBe('true');
    expect(current.tagName).toBe('DIV');
    expect(getComputedStyle(current).cursor).toBe('default');

    const reset = requireValue(findByRole('option', 'Reset to Stagistic Default'));
    const divider = requireValue(reset.previousElementSibling);

    expect(getComputedStyle(divider).height).toBe('1px');
    expect(reset.getBoundingClientRect().top).toBeGreaterThan(divider.getBoundingClientRect().bottom);
    await clickRole('option', 'Reset to Stagistic Default');
    await expect.poll(() => findByRole('tab', 'Stagistic Default')?.getAttribute('aria-selected')).toBe('true');
    expect(repository.rows()[0]?.formatTemplateId).toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => findByRole('tab', 'Dramatists Guild — Traditional')?.getAttribute('aria-selected')).toBe('true');
    await click('Cancel');
    expect(repository.rows()[0]?.formatTemplateId).toBeNull();
});

it('keeps a failed application open without a success toast and allows retry', async () => {
    const repository = makeRepository();
    const save = vi.spyOn(repository.repository, 'saveScriptSettings').mockRejectedValueOnce(new Error('Storage unavailable'));
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await pick('Dramatists Guild — Modern');
    await click('Use Dramatists Guild — Modern');
    await expect.poll(() => document.body.textContent).toContain('Could not save the format. Try again.');
    expect(repository.rows()[0]?.formatTemplateId).toBeNull();
    expect(document.querySelector('[aria-label="Notifications"]')).toBeNull();
    await click('Use Dramatists Guild — Modern');
    await expect.poll(() => document.querySelector('[aria-label="Notifications"]')?.textContent).toContain('Dramatists Guild — Modern');
    expect(repository.rows()[0]?.formatTemplateId).toBe('dg-modern');
    expect(document.querySelector('dialog[aria-label="Choose format template"]')).toBeNull();
    save.mockRestore();
});

it('materializes a legacy lock before the first independent page edit', async () => {
    const repository = makeRepository({blocks: {character: {shortcut: '5'}}}, 'samuel-french');
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness repository={repository.repository} />);
    await expect.poll(() => findButton('Select page size')?.textContent).toContain('US Letter');
    await click('Select page size');
    await clickRole('option', 'A4');
    await expect.poll(() => repository.rows()[0]?.settings.page?.widthPx).toBe(794);
    expect(repository.rows()[0]?.settings.typography?.lineHeight).toBe(1);
    expect(repository.rows()[0]?.settings.pdfFlow?.continuationMark).toBe('cont');
    expect(repository.rows()[0]?.settings.headerFooter?.header?.right?.text).toBe('{{page}}.');
    expect(repository.rows()[0]?.formatTemplateId).toBe('samuel-french');
    await click('Block panel');
    await editFormat('Unlock to edit');
    await click('Unlock template');
    await expect.poll(() => repository.rows()[0]?.formatTemplateId).toBeNull();
    expect(repository.rows()[0]?.settings.page?.widthPx).toBe(794);
    expect(repository.rows()[0]?.settings.typography?.lineHeight).toBe(1);
});
