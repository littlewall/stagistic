import type {SVGProps} from 'react';

/* No iconoir equivalent; drawn on its 24px grid with its 1.5 stroke. */
export const ReplaceIcon = (props: SVGProps<SVGSVGElement>) => (
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
            y="4"
            width="8"
            height="6"
            rx="1.5"
        />
        <path d="M7 10v4a3 3 0 0 0 3 3h3M11 15l2 2-2 2" />
        <rect
            x="15"
            y="14"
            width="6"
            height="6"
            rx="1.5"
        />
    </svg>
);
