import type {EditorCommentThreadRef} from './types';

/** Gets an underline and a margin marker; resolved or filtered-out threads only tint while active. */
export const isThreadMarked = (thread: EditorCommentThreadRef | undefined) => thread?.status === 'open' && !thread.isFilteredOut;
