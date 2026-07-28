import {BLOCKS_WITHOUT_ACT} from '../../blocks/blockRegistry';
import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import styles from '../EditorBlockActionsOverlay.module.css';
import {ContextMenu} from './ContextMenu';
import type {BlockTypeMenuProps} from './types';

export const BlockTypeMenu = ({
    blockType,
    isMenuAbove,
    menuRef,
    menuStyle,
    onClose,
    onMenuItemMouseDown,
}: BlockTypeMenuProps) => {
    return (
        <ContextMenu
            ariaLabel="Block types"
            items={BLOCKS_WITHOUT_ACT.map(option => ({
                kind: 'command',
                id: option.type,
                label: option.label,
                icon: BLOCK_ICONS[option.type],
                isActive: option.type === blockType,
                onMouseDown: event => onMenuItemMouseDown(option.type, event),
            }))}
            isMenuAbove={isMenuAbove}
            menuRef={menuRef}
            menuStyle={menuStyle}
            positionClassName={styles.typeMenu}
            rootDataAttributes={{'data-block-type-menu': 'true'}}
            onClose={onClose}
        />
    );
};
