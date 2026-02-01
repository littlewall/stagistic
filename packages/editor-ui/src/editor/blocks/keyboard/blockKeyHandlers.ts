import {
    type FountainElementType,
    getElementText,
    getEnterNextType,
    setSelectionBlockType,
} from '@stagistic/editor-core';
import type {PlateEditor} from 'platejs/react';
import {
    Path,
    Point,
    Range,
} from 'slate';

type KeyEventLike = {
    key: string,
    shiftKey?: boolean,
    preventDefault: () => void,
};

export type BlockKeyHandlerContext = {
    editor: PlateEditor,
    event: KeyEventLike,
    blockEntry: [unknown, Path],
    blockNode: unknown,
    path: Path,
    selection: PlateEditor['selection'],
};

export type BlockKeyHandler = (
    context: BlockKeyHandlerContext
) => boolean | undefined;

type BlockKeyHandlerOptions = {
    blockType: FountainElementType,
    handlers: Partial<Record<string, BlockKeyHandler>>,
    shouldHandle?: (editor: PlateEditor) => boolean,
};

const isBlockNodeOfType = (node: unknown, type: FountainElementType) => {
    if (!node || typeof node !== 'object') return false;

    if (!('type' in node)) return false;

    return (node as {type?: FountainElementType}).type === type;
};

export const createBlockKeyHandler =
  ({
      blockType, handlers, shouldHandle,
  }: BlockKeyHandlerOptions) => ({editor, event}: {editor: PlateEditor, event: KeyEventLike}) => {
      const handler = handlers[event.key];

      if (!handler) {
          return undefined;
      }

      if (shouldHandle && !shouldHandle(editor)) {
          return undefined;
      }

      const blockEntry = editor.api.block({at: editor.selection ?? undefined});

      if (!blockEntry) return undefined;

      const [blockNode, path] = blockEntry;

      if (!isBlockNodeOfType(blockNode, blockType)) {
          return undefined;
      }

      return handler({
          editor,
          event,
          blockEntry,
          blockNode,
          path,
          selection: editor.selection,
      });
  };

export const defaultEnterKeyHandler =
  (blockType: FountainElementType): BlockKeyHandler => ({
      editor, event, path, selection,
  }) => {
      event.preventDefault();
      if (selection && !Range.isCollapsed(selection)) {
          editor.tf.delete();
      }

      let isAtEnd = false;

      if (selection && Range.isCollapsed(selection)) {
          const end = editor.api.end(path);

          if (end) {
              isAtEnd = Point.equals(selection.anchor, end);
          }
      }

      editor.tf.insertBreak();

      const nextType = isAtEnd ? getEnterNextType(editor, blockType) : blockType;
      const nextPath = setSelectionBlockType(editor, nextType);

      if (nextPath) {
          const point = editor.api.start(nextPath);

          editor.tf.select(point);
      }

      return true;
  };

export const insertTextKeyHandler =
  (text: string): BlockKeyHandler => ({
      editor, event, selection,
  }) => {
      event.preventDefault();
      if (selection && !Range.isCollapsed(selection)) {
          editor.tf.delete();
      }

      editor.tf.insertText(text);

      return true;
  };

export const createLeadingIndentKeyHandler = (
    maxIndent: number,
    indentText = '\t',
): BlockKeyHandler => {
    return ({
        editor, event, blockNode, path, selection,
    }) => {
        event.preventDefault();

        const start = editor.api.start(path);

        if (!start) {
            return true;
        }

        if (selection && !Range.isCollapsed(selection)) {
            editor.tf.delete();
        }

        const currentEntry = editor.api.node(path);
        const currentNode = currentEntry ? currentEntry[0] : blockNode;
        const text = getElementText(currentNode as {children: Array<{text: string}>});
        let indentCount = 0;
        let offset = 0;

        while (text.startsWith(indentText, offset)) {
            indentCount += 1;
            offset += indentText.length;
        }

        if (event.shiftKey) {
            if (indentCount === 0 || !text.startsWith(indentText)) {
                return true;
            }

            const focus = {path: start.path, offset: start.offset + indentText.length};

            editor.tf.delete({at: {anchor: start, focus}});

            return true;
        }

        if (indentCount >= maxIndent) {
            return true;
        }

        editor.tf.insertText(indentText, {at: start});

        return true;
    };
};
