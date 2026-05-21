import type {SVGProps} from 'react';

export const ActBlockIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable={false}
        {...props}
    >
        <path d="M5 18h14M12 6v12" />
        <path d="M8 10h8" />
    </svg>
);
