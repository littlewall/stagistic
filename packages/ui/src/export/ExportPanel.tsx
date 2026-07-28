import type {ReactNode} from 'react';

import styles from './ExportPanel.module.css';

interface ExportPanelProps {
    children: ReactNode,
}

interface ExportPanelSectionProps {
    children: ReactNode,
}

const Section = ({
    title,
    children,
}: ExportPanelSectionProps & {title: string}) => (
    <section className={styles.section} aria-labelledby={`export-${title.toLowerCase()}`}>
        <h2 className={styles.heading} id={`export-${title.toLowerCase()}`}>{title}</h2>
        <div className={styles.body}>{children}</div>
    </section>
);

export const ExportPanel = ({children}: ExportPanelProps) => (
    <div className={styles.panel}>{children}</div>
);

ExportPanel.Input = function ExportPanelInput({children}: ExportPanelSectionProps) {
    return <Section title="Input">{children}</Section>;
};

ExportPanel.Options = function ExportPanelOptions({children}: ExportPanelSectionProps) {
    return <Section title="Options">{children}</Section>;
};
