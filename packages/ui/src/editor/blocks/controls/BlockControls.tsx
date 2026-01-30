import {BlockMenuPlugin} from '@platejs/selection/react';
import {type FountainElement} from '@stagistic/editor-core';
import clsx from 'clsx';
import {
    useEditorRef,
    useElement,
    useFocused,
    usePath,
    usePluginOption,
} from 'platejs/react';
import {useEffect} from 'react';
import {Path} from 'slate';

import {BLOCK_ICONS} from '~blocks/controls/blockIcons';
import {applyBlockTypeChange} from '~blocks/fountainBlockHelpers';
import {FOUNTAIN_BLOCKS} from '~blocks/fountainBlockRegistry';

import styles from './BlockControls.module.css';

const BlockControls = () => {
    const editor = useEditorRef();
    const element = useElement<FountainElement>();
    const path = usePath();
    let elementPath: Path;

    try {
        elementPath = path ?? editor.api.findPath(element);
    } catch {
        return null;
    }

    const isFocused = useFocused();
    const selectionPath = editor.selection?.focus?.path ?? editor.selection?.anchor?.path;
    const activeBlockEntry = selectionPath
        ? editor.api.block({at: selectionPath})
        : null;
    const isSelectionInBlock = !!activeBlockEntry && Path.equals(activeBlockEntry[1], elementPath);
    const blockId = elementPath.join('-');
    const openId = usePluginOption(BlockMenuPlugin, 'openId');
    const isOpen = openId === blockId;
    const activeOption = FOUNTAIN_BLOCKS.find(
        option => option.type === element.type,
    );
    const activeIcon = BLOCK_ICONS[element.type];
    const activeLabel = activeOption?.label ?? 'Block';
    const blockMenuApi = editor.getApi(BlockMenuPlugin).blockMenu;
    const shouldShowControls = isFocused && isSelectionInBlock;

    useEffect(() => {
        if (!shouldShowControls && openId === blockId) {
            blockMenuApi.hide();
        }
    }, [
        blockId,
        blockMenuApi,
        openId,
        shouldShowControls,
    ]);

    if (!shouldShowControls) {
        return null;
    }

    return (
        <span className={styles.controls}>
            <button
                className={styles.trigger}
                type="button"
                aria-label={`Change block type (current: ${activeLabel})`}
                aria-expanded={isOpen}
                onMouseDown={event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (isOpen) {
                        blockMenuApi.hide();

                        return;
                    }

                    blockMenuApi.show(blockId);
                }}
            >
                <span className={styles.triggerIcon}>{activeIcon}</span>
            </button>
            {isOpen ? (
                <span className={styles.menu} role="menu">
                    {FOUNTAIN_BLOCKS.map(option => (
                        <button
                            key={option.type}
                            type="button"
                            role="menuitem"
                            className={clsx(
                                styles.menuItem,
                                option.type === element.type && styles.menuItemActive,
                            )}
                            onMouseDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                blockMenuApi.hide();
                                applyBlockTypeChange(editor, element, elementPath, option.type);
                            }}
                        >
                            <span className={styles.menuItemIcon}>
                                {BLOCK_ICONS[option.type]}
                            </span>
                            <span className={styles.menuItemLabel}>{option.label}</span>
                        </button>
                    ))}
                </span>
            ) : null}
        </span>
    );
};

export default BlockControls;
