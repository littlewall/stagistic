import { useEffect, useMemo, useState } from 'react';
import { useEditorRef, useEditorVersion } from 'platejs/react';
import { FOUNTAIN_BLOCKS } from '../blocks/fountainBlockRegistry';
import {
  applyBlockTypeChange,
  type FountainBlockTypeChangeTarget,
} from '../blocks/fountainBlockHelpers';
import { BLOCK_ICONS } from '../blocks/controls/blockIcons';

type EditorToolbarProps = {
  onSave?: () => void;
};

const EditorToolbar = ({ onSave }: EditorToolbarProps) => {
  const editor = useEditorRef();
  const editorVersion = useEditorVersion();

  const activeBlock = useMemo(() => {
    return editor.api.block({ at: editor.selection ?? undefined });
  }, [editor, editorVersion]);

  const activeElement = activeBlock?.[0] as FountainBlockTypeChangeTarget | undefined;
  const activePath = activeBlock?.[1];
  const activeType = activeElement?.type;
  const activeIcon = activeType ? BLOCK_ICONS[activeType] : null;
  const canUndo = (editor.history?.undos?.length ?? 0) > 0;
  const canRedo = (editor.history?.redos?.length ?? 0) > 0;
  const [isOpen, setIsOpen] = useState(false);
  const activeBlockKey = activePath ? activePath.join('-') : null;

  useEffect(() => {
    setIsOpen(false);
  }, [activeBlockKey]);

  const toggleMark = (key: 'bold' | 'italic' | 'underline') => {
    const isActive = !!editor.api.marks()?.[key];
    if (isActive) {
      editor.tf.removeMarks(key);
    } else {
      editor.tf.addMark(key, true);
    }
  };

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__group">
        {onSave ? (
          <button
            className="editor-toolbar__icon-button"
            type="button"
            aria-label="Save"
            onMouseDown={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 4h12l3 3v13H5z" />
              <path d="M8 4v6h8V4" />
              <path d="M8 20v-6h8v6" />
            </svg>
          </button>
        ) : null}
        <button
          className="editor-toolbar__icon-button"
          type="button"
          aria-label="Undo"
          disabled={!canUndo}
          onMouseDown={(event) => {
            event.preventDefault();
            if (canUndo) editor.undo();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l-4 4 4 4" />
            <path d="M20 11H4" />
          </svg>
        </button>
        <button
          className="editor-toolbar__icon-button"
          type="button"
          aria-label="Redo"
          disabled={!canRedo}
          onMouseDown={(event) => {
            event.preventDefault();
            if (canRedo) editor.redo();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M17 7l4 4-4 4" />
            <path d="M4 11h16" />
          </svg>
        </button>
        <button
          className="editor-toolbar__icon-button"
          type="button"
          aria-label="Bold"
          onMouseDown={(event) => {
            event.preventDefault();
            toggleMark('bold');
          }}
        >
          <span className="editor-toolbar__text-icon">B</span>
        </button>
        <button
          className="editor-toolbar__icon-button"
          type="button"
          aria-label="Italic"
          onMouseDown={(event) => {
            event.preventDefault();
            toggleMark('italic');
          }}
        >
          <span className="editor-toolbar__text-icon editor-toolbar__text-icon--italic">I</span>
        </button>
        <button
          className="editor-toolbar__icon-button"
          type="button"
          aria-label="Underline"
          onMouseDown={(event) => {
            event.preventDefault();
            toggleMark('underline');
          }}
        >
          <span className="editor-toolbar__text-icon editor-toolbar__text-icon--underline">U</span>
        </button>
      </div>
      <div className="editor-toolbar__group editor-toolbar__dropdown">
        <button
          className="editor-toolbar__select-button"
          type="button"
          aria-label="Change block type"
          aria-expanded={isOpen}
          disabled={!activeType}
          onMouseDown={(event) => {
            event.preventDefault();
            if (!activeType) return;
            setIsOpen((prev) => !prev);
          }}
        >
          <span className="editor-toolbar__icon">
            {activeIcon}
          </span>
          <span className="editor-toolbar__select-label">
            {FOUNTAIN_BLOCKS.find((option) => option.type === activeType)
              ?.label ?? 'Block'}
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className="editor-toolbar__chevron"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {isOpen ? (
          <div className="editor-toolbar__menu" role="menu">
            {FOUNTAIN_BLOCKS.map((option) => (
              <button
                key={option.type}
                type="button"
                role="menuitem"
                className={
                  option.type === activeType
                    ? 'editor-toolbar__menu-item is-active'
                    : 'editor-toolbar__menu-item'
                }
                aria-label={`Set block type to ${option.label}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (!activeElement || !activePath) return;
                  if (option.type === activeType) return;
                  setIsOpen(false);
                  applyBlockTypeChange(
                    editor,
                    activeElement,
                    activePath,
                    option.type
                  );
                }}
              >
                <span className="editor-toolbar__icon">
                  {BLOCK_ICONS[option.type]}
                </span>
                <span className="editor-toolbar__menu-label">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EditorToolbar;
