import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {AttributeManagerCharactersPanel} from './AttributeManagerCharactersPanel';
import {
    CHARACTERS,
    cleanupPanels,
    findButtonByText,
    GROUPS,
    mountedRoots,
    waitForElement,
} from './AttributeManagerCharactersPanel.browser.testUtils';

afterEach(cleanupPanels);

const createHost = () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    host.style.width = '900px';
    host.style.height = '600px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);
    mountedRoots.push(root);
    return root;
};

describe('AttributeManagerCharactersPanel groups workspace', () => {
    it('separates an empty groups list from the next action', async () => {
        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={[]}
                initialWorkspaceId="groups"
                onCreateGroup={() => null}
            />,
        );
        const list = await waitForElement('[aria-label="Groups list"]');
        const detail = await waitForElement('[aria-label="Groups detail"]');
        expect(list.textContent).toContain('No groups yet.');
        expect(detail.textContent).toContain('Create a group to edit details here.');
        expect(detail.textContent).not.toContain('No groups yet.');
    });

    it('searches, selects, and creates an initially empty group', async () => {
        const onCreateGroup = vi.fn((name: string) => Promise.resolve({id: 'group-3', name}));
        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={GROUPS}
                initialWorkspaceId="groups"
                initialSelectedGroupId="group-1"
                onCreateGroup={onCreateGroup}
            />,
        );
        const search = await waitForElement<HTMLInputElement>('[aria-label="Search groups"]');
        expect(search.disabled).toBe(false);
        expect(document.querySelector('[aria-label="Groups detail"]')?.textContent).toContain('Members');
        await page.elementLocator(search).fill('ensemble');
        expect(document.querySelector('[aria-label="Groups list"]')?.textContent).not.toContain('ALL');
        expect(document.querySelector('[aria-label="Groups list"]')?.textContent).toContain('ENSEMBLE');
        await page.elementLocator(findButtonByText('ENSEMBLE')).click();
        expect(document.querySelector('[aria-label="Groups detail"] h3')?.textContent).toBe('ENSEMBLE');
        await page.elementLocator(await waitForElement('[aria-label="Create group"]')).click();
        await page.elementLocator(await waitForElement<HTMLInputElement>('#create-group-name')).fill('Chorus');
        await page.elementLocator(findButtonByText('Create group')).click();
        expect(onCreateGroup).toHaveBeenCalledWith('CHORUS');
    });

    it('rejects cross-kind duplicates when creating a group', async () => {
        const onCreateGroup = vi.fn();
        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={GROUPS}
                initialWorkspaceId="groups"
                onCreateGroup={onCreateGroup}
            />,
        );
        await page.elementLocator(await waitForElement('[aria-label="Create group"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-group-name');
        await page.elementLocator(input).fill('Anna (V.O.)');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(document.body.textContent).toContain('A character or group with this name already exists.');
        expect(onCreateGroup).not.toHaveBeenCalled();
        await page.elementLocator(input).fill('   ');
        await userEvent.keyboard('{Tab}');
        expect(document.body.textContent).toContain('Name cannot be empty.');
        expect(onCreateGroup).not.toHaveBeenCalled();
    });

    it('does not show a duplicate error for the optimistic group while creation is pending', async () => {
        let resolvePersistence: () => void = () => undefined;
        const TestCase = () => {
            const [groups, setGroups] = useState(GROUPS);
            const handleCreate = async (name: string) => {
                setGroups(current => [...current, {
                    id: 'group-3', name, color: null, memberIds: [], usageCount: 0,
                }]);
                await new Promise<void>(resolve => {
                    resolvePersistence = resolve;
                });
                return {id: 'group-3'};
            };
            return (
                <AttributeManagerCharactersPanel
                    characters={CHARACTERS}
                    groups={groups}
                    initialWorkspaceId="groups"
                    onCreateGroup={handleCreate}
                />
            );
        };
        createHost().render(<TestCase />);
        await page.elementLocator(await waitForElement('[aria-label="Create group"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-group-name');
        await page.elementLocator(input).fill('Chorus');
        await page.elementLocator(findButtonByText('Create group')).click();
        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(input.getAttribute('aria-invalid')).toBe('false');
        expect(document.querySelector('#create-group-error')).toBeNull();
        expect(document.querySelector('dialog[aria-label="Create group"]')?.hasAttribute('open')).toBe(true);
        resolvePersistence();
        await new Promise(resolve => window.setTimeout(resolve, 20));
        expect(document.querySelector('dialog[aria-label="Create group"]')?.hasAttribute('open')).toBe(false);
    });

    it('keeps a rejected group creation usable with normal validation', async () => {
        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={GROUPS}
                initialWorkspaceId="groups"
                onCreateGroup={() => Promise.reject(new Error('write failed'))}
            />,
        );
        await page.elementLocator(await waitForElement('[aria-label="Create group"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-group-name');

        await page.elementLocator(input).fill('Chorus');
        await page.elementLocator(findButtonByText('Create group')).click();
        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(input.isConnected).toBe(true);
        expect(input.disabled).toBe(false);
        expect(document.querySelector('dialog[aria-label="Create group"]')?.hasAttribute('open')).toBe(true);
        await page.elementLocator(input).fill('Anna');
        expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps a null group creation usable with normal validation', async () => {
        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={GROUPS}
                initialWorkspaceId="groups"
                onCreateGroup={() => null}
            />,
        );
        await page.elementLocator(await waitForElement('[aria-label="Create group"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-group-name');

        await page.elementLocator(input).fill('Chorus');
        await page.elementLocator(findButtonByText('Create group')).click();
        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(document.querySelector('dialog[aria-label="Create group"]')?.hasAttribute('open')).toBe(true);
        expect(input.disabled).toBe(false);
        await page.elementLocator(input).fill('Anna');
        expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps membership selection usable while persistence is pending', async () => {
        const onChange = vi.fn((
            _id: string,
            _memberIds: string[],
        ) => new Promise<void>(() => undefined));
        const TestCase = () => {
            const [groups, setGroups] = useState(GROUPS);
            const handleChange = (id: string, memberIds: string[]) => {
                setGroups(current => current.map(group => group.id === id ? {...group, memberIds} : group));

                return onChange(id, memberIds);
            };

            return (
                <AttributeManagerCharactersPanel
                    characters={CHARACTERS}
                    groups={groups}
                    initialWorkspaceId="groups"
                    initialSelectedGroupId="group-1"
                    onChangeGroupMemberIds={handleChange}
                />
            );
        };

        createHost().render(<TestCase />);
        const input = await waitForElement<HTMLInputElement>('[placeholder="Select members"]');

        await page.elementLocator(input).click();
        await page.elementLocator(
            await waitForElement<HTMLElement>('[data-testid="suggestions"] li'),
        ).click();
        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(onChange).toHaveBeenCalledWith('group-1', ['char-1']);
        const currentInput = await waitForElement<HTMLInputElement>('[placeholder="Select members"]');

        expect(currentInput).toBe(input);
        expect(currentInput.readOnly).toBe(false);
        await page.elementLocator(currentInput).click();
        const boris = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="suggestions"] li'))
            .find(option => option.textContent?.trim() === 'BORIS');

        if (!boris) {
            throw new Error('Expected BORIS suggestion');
        }

        await page.elementLocator(boris).click();
        expect(onChange).toHaveBeenLastCalledWith('group-1', ['char-1', 'char-2']);
    });

    it('updates group color and renders used and unused deletion warnings', async () => {
        const onSetGroupColor = vi.fn();
        const onDeleteGroup = vi.fn();

        createHost().render(
            <AttributeManagerCharactersPanel
                characters={CHARACTERS}
                groups={GROUPS}
                initialWorkspaceId="groups"
                initialSelectedGroupId="group-1"
                onSetGroupColor={onSetGroupColor}
                onDeleteGroup={onDeleteGroup}
            />,
        );

        await page.elementLocator(await waitForElement('[aria-label="Choose color for ALL"]')).click();
        await page.elementLocator(findButtonByText('Apply')).click();
        expect(onSetGroupColor).toHaveBeenCalledWith('group-1', expect.any(String));
        await page.elementLocator(await waitForElement('[aria-label="Remove ALL"]')).click();
        expect(document.body.textContent).toContain('Its occurrences stay in the script and become unconfirmed characters.');
        await page.elementLocator(findButtonByText('Cancel')).click();
        await page.elementLocator(findButtonByText('ENSEMBLE')).click();
        await page.elementLocator(await waitForElement('[aria-label="Remove ENSEMBLE"]')).click();
        expect(document.body.textContent).not.toContain('Its occurrences stay in the script and become unconfirmed characters.');
    });

    it('restores confirmed group color when persistence rejects', async () => {
        const onSetColor = vi.fn((
            _id: string,
            _color: string | null,
        ) => Promise.reject(new Error('write failed')));
        const TestCase = () => {
            const [groups, setGroups] = useState(GROUPS);
            const handleSetColor = async (id: string, color: string | null) => {
                const confirmed = groups;

                setGroups(current => current.map(group => group.id === id ? {...group, color} : group));
                try {
                    await onSetColor(id, color);
                } catch (error) {
                    setGroups(confirmed);
                    throw error;
                }
            };

            return (
                <AttributeManagerCharactersPanel
                    characters={CHARACTERS}
                    groups={groups}
                    initialWorkspaceId="groups"
                    initialSelectedGroupId="group-1"
                    onSetGroupColor={handleSetColor}
                />
            );
        };

        createHost().render(<TestCase />);
        const colorTrigger = await waitForElement<HTMLElement>('[aria-label="Choose color for ALL"]');

        await page.elementLocator(colorTrigger).click();
        await page.elementLocator(findButtonByText('Apply')).click();
        await new Promise(resolve => window.setTimeout(resolve, 20));

        expect(onSetColor).toHaveBeenCalledWith('group-1', expect.any(String));
        expect(colorTrigger.style.getPropertyValue('--character-color')).toBe('#778899');
    });
});
