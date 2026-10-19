import type {SVGProps} from 'react';

/* "ab" over a bracket for match whole word; no iconoir equivalent, drawn on its 24px grid with its 1.5 stroke. */
export const WholeWordIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M10.5 10v6M10.5 13a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 1 1 5.5 0" />
        <path d="M13.5 6.5V16M13.5 13a2.75 2.75 0 1 0 5.5 0 2.75 2.75 0 1 0-5.5 0" />
        <path d="M3 17.5v2h18v-2" />
    </svg>
);
