import type {SetStateAction} from 'react';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {handleSuggestionKeyDown} from './suggestionKeyboardNavigation';

const navigate = (key: string, initialIndex: number | null, suggestions = ['First', 'Second']) => {
    let activeIndex = initialIndex;
    const event = {
        key,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
    };
    const onSelect = vi.fn();

    handleSuggestionKeyDown({
        event: event as unknown as KeyboardEvent,
        suggestions,
        activeSuggestionIndex: initialIndex,
        setActiveSuggestionIndex: (action: SetStateAction<number | null>) => {
            activeIndex = typeof action === 'function' ? action(activeIndex) : action;
        },
        onSelect,
    });

    return {
        activeIndex,
        event,
        onSelect,
    };
};

describe('suggestion keyboard navigation', () => {
    it('starts at the first or last suggestion and wraps in both directions', () => {
        expect(navigate('ArrowDown', null).activeIndex).toBe(0);
        expect(navigate('ArrowUp', null).activeIndex).toBe(1);
        expect(navigate('ArrowDown', 1).activeIndex).toBe(0);
        expect(navigate('ArrowUp', 0).activeIndex).toBe(1);
    });

    it('consumes Enter only when a selected suggestion exists', () => {
        const selected = navigate('Enter', 1);

        expect(selected.onSelect).toHaveBeenCalledWith('Second');
        expect(selected.event.preventDefault).toHaveBeenCalledOnce();
        expect(selected.event.stopPropagation).toHaveBeenCalledOnce();

        for (const initialIndex of [null, 2]) {
            const unselected = navigate('Enter', initialIndex);

            expect(unselected.onSelect).not.toHaveBeenCalled();
            expect(unselected.event.preventDefault).not.toHaveBeenCalled();
        }
    });

    it('leaves empty lists and unrelated keys to the editor', () => {
        for (const result of [navigate('ArrowDown', null, []), navigate('Escape', 0)]) {
            expect(result.event.preventDefault).not.toHaveBeenCalled();
            expect(result.onSelect).not.toHaveBeenCalled();
        }
    });
});
