import type {SVGProps} from 'react';

/* "Aa" glyph for match case; no iconoir equivalent, drawn on its 24px grid with its 1.5 stroke. */
export const CaseSensitiveIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M2.5 18 7 6l4.5 12M4.2 13.5h5.6" />
        <path d="M20.5 12.5V18M20.5 15.25a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 1 1 5.5 0" />
    </svg>
);
