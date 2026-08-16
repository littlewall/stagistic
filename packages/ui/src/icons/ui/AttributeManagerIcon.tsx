import type {SVGProps} from 'react';

/**
 * Hand-drawn because no icon set carries this concept. The attribute manager
 * holds four registers — structure, characters, music, places — and what they
 * share is not "a list" but "named entities that carry a colour". The chip and
 * the name are literally the data model, so the icon draws three of those rows.
 *
 * Kept on the iconoir grid (24x24, 1.5 stroke, currentColor) so it sits beside
 * the rest of the set without looking imported from somewhere else.
 */
export const AttributeManagerIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        width="1.5em"
        height="1.5em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect
            x="3"
            y="4.75"
            width="4"
            height="4"
            rx="1.2"
        />
        <path d="M10 6.75h11" />
        <rect
            x="3"
            y="10"
            width="4"
            height="4"
            rx="1.2"
        />
        <path d="M10 12h11" />
        <rect
            x="3"
            y="15.25"
            width="4"
            height="4"
            rx="1.2"
        />
        <path d="M10 17.25h7.5" />
    </svg>
);
