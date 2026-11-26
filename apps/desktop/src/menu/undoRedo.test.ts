import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {type HistoryDirection, runHistoryCommand} from './undoRedo';

const setup = (inEditor: boolean | null) => {
    const events: Event[] = [];
    const commands: string[] = [];
    const activeElement = inEditor === null ? null : {
        closest: (selector: string) => (inEditor && selector === '.ProseMirror' ? {} : null),
        dispatchEvent: (event: Event) => {
            events.push(event);

            return true;
        },
    } as unknown as Element;

    runHistoryCommand('undo', {
        activeElement,
        execCommand: command => commands.push(command),
        createKeyEvent: (direction: HistoryDirection) => ({type: direction}) as Event,
    });

    return {events, commands};
};

describe('Edit ▸ Undo/Redo', () => {
    it('replays the shortcut on the focused script editor', () => {
        const {events, commands} = setup(true);

        expect(events.map(event => event.type)).toEqual(['undo']);
        expect(commands).toEqual([]);
    });

    it('uses the browser undo in plain inputs', () => {
        const {events, commands} = setup(false);

        expect(events).toEqual([]);
        expect(commands).toEqual(['undo']);
    });

    it('does not fail with nothing focused', () => {
        expect(() => setup(null)).not.toThrow();
    });
});
