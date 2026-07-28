import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveOverlayTransactionAction} from './transactionOverlayPolicy';

describe('resolveOverlayTransactionAction', () => {
    it('schedules an update for doc changes', () => {
        expect(resolveOverlayTransactionAction({
            transaction: {
                docChanged: true,
                selectionSet: true,
            },
            interactionState: 'open_no_selection',
            isComposeActive: true,
            isEmptyEnterChooserOpen: false,
        })).toBe('schedule');
    });

    it('keeps suggestions alive for selection-only updates while compose stays active', () => {
        expect(resolveOverlayTransactionAction({
            transaction: {
                docChanged: false,
                selectionSet: true,
            },
            interactionState: 'open_no_selection',
            isComposeActive: true,
            isEmptyEnterChooserOpen: false,
        })).toBe('schedule');
    });

    it('opens suggestions for selection-only updates that start compose', () => {
        expect(resolveOverlayTransactionAction({
            transaction: {
                docChanged: false,
                selectionSet: true,
            },
            interactionState: 'closed',
            isComposeActive: true,
            isEmptyEnterChooserOpen: false,
        })).toBe('schedule');
    });

    it('closes the overlay for selection-only updates without compose', () => {
        expect(resolveOverlayTransactionAction({
            transaction: {
                docChanged: false,
                selectionSet: true,
            },
            interactionState: 'open_no_selection',
            isComposeActive: false,
            isEmptyEnterChooserOpen: false,
        })).toBe('close');
    });

    it('closes the overlay when the empty-enter chooser opens', () => {
        expect(resolveOverlayTransactionAction({
            transaction: {
                docChanged: false,
                selectionSet: false,
            },
            interactionState: 'open_no_selection',
            isComposeActive: true,
            isEmptyEnterChooserOpen: true,
        })).toBe('close');
    });
});
