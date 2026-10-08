import {isChangeOrigin} from '@tiptap/extension-collaboration';
import type {Transaction} from '@tiptap/pm/state';

/*
 * Transactions applied by the Y.Doc binding carry changes another replica
 * already made. Plugins that react to edits (appendTransaction, follow-up
 * callbacks) must skip them, or every replica repeats the follow-up and the
 * shared doc gets it twice (invariant 3).
 */
export const isRemoteTransaction = (transaction: Transaction) => isChangeOrigin(transaction);

export const localTransactions = (transactions: readonly Transaction[]) => transactions.filter(transaction => !isRemoteTransaction(transaction));
