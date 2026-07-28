import type {SuggestionInteractionState} from './useSuggestionInteractionState';

type OverlayTransaction = {
    docChanged: boolean,
    selectionSet: boolean,
};

type ResolveOverlayTransactionActionArgs = {
    transaction: OverlayTransaction,
    interactionState: SuggestionInteractionState,
    isComposeActive: boolean,
    isEmptyEnterChooserOpen: boolean,
};

export type OverlayTransactionAction = 'close' | 'schedule' | 'noop';

export const resolveOverlayTransactionAction = ({
    transaction,
    interactionState,
    isComposeActive,
    isEmptyEnterChooserOpen,
}: ResolveOverlayTransactionActionArgs): OverlayTransactionAction => {
    if (interactionState === 'open_no_selection' && isEmptyEnterChooserOpen) {
        return 'close';
    }

    if (transaction.docChanged) {
        return 'schedule';
    }

    if (!transaction.selectionSet) {
        return 'noop';
    }

    if (isComposeActive) {
        return 'schedule';
    }

    return 'close';
};
