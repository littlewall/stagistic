import {IconButton, Tooltip} from '@stagistic/ui';
import {type ReactNode} from 'react';

interface SidebarContextButtonProps {
    ariaLabel: string,
    tooltipLabel?: string,
    onClick: () => void,
    children: ReactNode,
}

export const SidebarContextButton = ({
    ariaLabel,
    tooltipLabel,
    onClick,
    children,
}: SidebarContextButtonProps) => {
    const button = (
        <IconButton
            size="xs"
            aria-label={ariaLabel}
            onMouseDown={event => {
                event.preventDefault();
                onClick();
            }}
        >
            {children}
        </IconButton>
    );

    if (!tooltipLabel) {
        return button;
    }

    return (
        <Tooltip label={tooltipLabel} placement="bottom">
            {button}
        </Tooltip>
    );
};
