import type {SVGProps} from 'react';

export const ParentheticalBlockIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable={false}
        {...props}
    >
        <path d="M9 5c-2 2-3 4-3 7s1 5 3 7" />
        <path d="M15 5c2 2 3 4 3 7s-1 5-3 7" />
    </svg>
);
