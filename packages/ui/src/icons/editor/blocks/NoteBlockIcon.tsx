import type {SVGProps} from 'react';

export const NoteBlockIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable={false}
        {...props}
    >
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M9 12h7M9 16h6" />
    </svg>
);
