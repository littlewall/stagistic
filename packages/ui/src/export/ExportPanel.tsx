import type {ReactNode} from 'react';
import {
    Disclosure,
    DisclosurePanel,
} from 'react-aria-components';

import {Button} from '../atoms/Button';
import {ChevronDownIcon} from '../icons';
import styles from './ExportPanel.module.css';

interface ExportPanelProps {
    children: ReactNode,
}

interface ExportPanelSectionProps {
    title: string,
    children: ReactNode,
}

const ExportPanelSection = ({
    title,
    children,
}: ExportPanelSectionProps) => (
    <Disclosure className={styles.section}>
        <h2 className={styles.heading}>
            <Button
                slot="trigger"
                variant="ghost"
                className={styles.trigger}
            >
                <span>{title}</span>
                <ChevronDownIcon
                    className={styles.chevron}
                    aria-hidden="true"
                />
            </Button>
        </h2>
        <DisclosurePanel role="region" className={styles.body}>
            {children}
        </DisclosurePanel>
    </Disclosure>
);

export const ExportPanel = ({children}: ExportPanelProps) => (
    <div className={styles.panel}>{children}</div>
);

ExportPanel.Section = function ExportPanelSectionComponent(props: ExportPanelSectionProps) {
    return <ExportPanelSection {...props} />;
};
