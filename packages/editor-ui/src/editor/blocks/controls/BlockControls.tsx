import { useEffect } from 'react';
import {
  useEditorRef,
  useElement,
  useFocused,
  usePath,
  usePluginOption,
} from 'platejs/react';
import { BlockMenuPlugin } from '@platejs/selection/react';
import { type FountainElement } from '@stagistic/editor-core';
import { Path } from 'slate';
import { FOUNTAIN_BLOCKS } from '../fountainBlockRegistry';
import { applyBlockTypeChange } from '../fountainBlockHelpers';
import { BLOCK_ICONS } from './blockIcons';
import styles from './BlockControls.module.css';
import clsx from 'clsx';

const BlockControls = () => {
  const editor = useEditorRef();
  const element = useElement<FountainElement>();
  const path = usePath();
  let elementPath = path;
  try {
    elementPath = editor.api.findPath(element);
  } catch {
    elementPath = path;
  }
  const isFocused = useFocused();
  const selectionPath = editor.selection?.focus?.path
    ?? editor.selection?.anchor?.path;
  const activeBlockEntry = selectionPath
    ? editor.api.block({ at: selectionPath })
    : null;
  const isSelectionInBlock = !!activeBlockEntry
    && Path.equals(activeBlockEntry[1], elementPath);
  const blockId = elementPath.join('-');
  const openId = usePluginOption(BlockMenuPlugin, 'openId');
  const isOpen = openId === blockId;
  const activeOption = FOUNTAIN_BLOCKS.find(
    (option) => option.type === element.type
  );
  const activeIcon = BLOCK_ICONS[element.type];
  const activeLabel = activeOption?.label ?? 'Block';
  const blockMenuApi = editor.getApi(BlockMenuPlugin).blockMenu;
  const shouldShowControls = isFocused && isSelectionInBlock;

  useEffect(() => {
    if (!shouldShowControls && openId === blockId) {
      blockMenuApi.hide();
    }
  }, [blockId, blockMenuApi, openId, shouldShowControls]);

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
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isOpen) {
            blockMenuApi.hide();
          } else {
            blockMenuApi.show(blockId);
          }
        }}
      >
        <span className={styles.triggerIcon}>{activeIcon}</span>
      </button>
      {isOpen ? (
        <span className={styles.menu} role="menu">
          {FOUNTAIN_BLOCKS.map((option) => (
            <button
              key={option.type}
              type="button"
              role="menuitem"
              className={clsx(
                styles.menuItem,
                option.type === element.type && styles.menuItemActive
              )}
              onMouseDown={(event) => {
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
