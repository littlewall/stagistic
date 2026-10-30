import type {SVGProps} from 'react';

/* The return-key arrow for "confirm with Enter"; no iconoir equivalent, drawn on its 24px grid with its 1.5 stroke. */
export const EnterKeyIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M19 5v6.5a3 3 0 0 1-3 3H5" />
        <path d="M9 10.5l-4 4 4 4" />
    </svg>
);
