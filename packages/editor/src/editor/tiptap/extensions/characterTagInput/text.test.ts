import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    PENDING_TAG_SPACE_CHARACTER,
    PLACEHOLDER_CHARACTER,
} from './constants';
import {
    isPendingTagSpaceGap,
    isPlaceholderText,
    normalizeCommittedTagName,
    normalizeTagTextSpaces,
    normalizeVisibleTagText,
    renderPendingTagText,
    resolveDoubleSpaceCommitName,
    stripLeadingPlaceholder,
} from './text';

describe('characterTagInput text helpers', () => {
    it('treats only the empty-tag placeholder as placeholder text', () => {
        expect(isPlaceholderText(PLACEHOLDER_CHARACTER)).toBe(true);
        expect(isPlaceholderText(' ')).toBe(true);
        expect(isPlaceholderText(PENDING_TAG_SPACE_CHARACTER)).toBe(false);
    });

    it('strips the empty-tag placeholder from compose text', () => {
        expect(stripLeadingPlaceholder(`${PLACEHOLDER_CHARACTER}JOE`)).toBe('JOE');
    });

    it('normalizes pending tag spaces back to regular spaces', () => {
        expect(normalizeTagTextSpaces(`JOE${PENDING_TAG_SPACE_CHARACTER}`)).toBe('JOE ');
    });

    it('normalizes visible tag text by removing the empty placeholder', () => {
        expect(normalizeVisibleTagText(`${PLACEHOLDER_CHARACTER}JOE`)).toBe('JOE');
    });

    it('treats a placeholder-only tag as an empty committed name', () => {
        expect(normalizeCommittedTagName(PLACEHOLDER_CHARACTER)).toBe('');
    });

    it('renders only trailing pending spaces as NBSP placeholders', () => {
        expect(renderPendingTagText('JOE ')).toBe(`JOE${PENDING_TAG_SPACE_CHARACTER}`);
    });

    it('treats only the NBSP gap as a pending tag separator', () => {
        expect(isPendingTagSpaceGap(PENDING_TAG_SPACE_CHARACTER)).toBe(true);
        expect(isPendingTagSpaceGap(PLACEHOLDER_CHARACTER)).toBe(false);
    });

    it('resolves a double trailing space commit with pending NBSP spaces', () => {
        expect(resolveDoubleSpaceCommitName(`JOE ${PENDING_TAG_SPACE_CHARACTER}`)).toBe('JOE');
    });
});
