export type EditorHotPathBenchmarkScenarioId =
    | 'typing-action'
    | 'typing-character'
    | 'enter-action'
    | 'enter-character'
    | 'shift-enter-character'
    | 'delete-block'
    | 'merge-blocks'
    | 'toggle-annotations'
    | 'rename-character';

export interface EditorHotPathBenchmarkScenario {
    id: EditorHotPathBenchmarkScenarioId,
    label: string,
    description: string,
}

export const HOT_PATH_BENCHMARK_SCENARIOS: readonly EditorHotPathBenchmarkScenario[] = [
    {
        id: 'typing-action',
        label: 'Typing Action',
        description: 'Type inside a regular action block without changing structure.',
    },
    {
        id: 'typing-character',
        label: 'Typing Character',
        description: 'Type inside a character block and refresh only character runtime state.',
    },
    {
        id: 'enter-action',
        label: 'Enter Action',
        description: 'Press Enter in an action block and move the selection without forcing full rebuilds.',
    },
    {
        id: 'enter-character',
        label: 'Enter Character',
        description: 'Press Enter in a character block and pay at most one character runtime rebuild.',
    },
    {
        id: 'shift-enter-character',
        label: 'Shift+Enter Character',
        description: 'Insert a soft break in dialogue flow while keeping character work bounded.',
    },
    {
        id: 'delete-block',
        label: 'Delete Block',
        description: 'Delete a block and rebuild structure only when outline-affecting blocks change.',
    },
    {
        id: 'merge-blocks',
        label: 'Merge Blocks',
        description: 'Backspace-merge adjacent blocks and keep untouched snapshots mapped instead of rebuilt.',
    },
    {
        id: 'toggle-annotations',
        label: 'Toggle Annotations',
        description: 'Enable or disable annotation decorations without forcing unrelated runtime recalculation.',
    },
    {
        id: 'rename-character',
        label: 'Rename Character',
        description: 'Confirm or rename a persistent character and refresh only touched character references.',
    },
] as const;
