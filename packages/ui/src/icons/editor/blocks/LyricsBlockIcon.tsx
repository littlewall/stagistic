import type {SVGProps} from 'react';

export const LyricsBlockIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable={false}
        {...props}
    >
        <path d="M10 6v9" />
        <path d="M10 6l8-2v9" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="16" cy="16" r="2" />
    </svg>
);
