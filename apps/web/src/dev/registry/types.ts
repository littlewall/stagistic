import type {ReactNode} from 'react';

export type CatalogEntry = {
    /** Component name as exported from @stagistic/ui. */
    name: string,
    /** The variables a caller may override, per the Declared Surface Rule. */
    variables: string[],
    /** One rendering per variant/state worth seeing side by side. */
    samples: {label: string, node: ReactNode}[],
};

export type CatalogGroup = {
    title: string,
    entries: CatalogEntry[],
};
