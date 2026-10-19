import type {SVGProps} from 'react';

/* `ReplaceIcon` with a second card behind each end. */
export const ReplaceAllIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M5 2h6.5A1.5 1.5 0 0 1 13 3.5V8" />
        <path d="M7 10v4a3 3 0 0 0 3 3h3M11 15l2 2-2 2" />
        <rect
            x="15"
            y="14"
            width="6"
            height="6"
            rx="1.5"
        />
        <path d="M17 12h3.5a1.5 1.5 0 0 1 1.5 1.5V18" />
    </svg>
);
