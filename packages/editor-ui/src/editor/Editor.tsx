import { useEffect, useMemo, useRef, useState } from 'react';
import { type Value } from 'platejs';
import type { SlateValue } from '@stagistic/shared';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { createFountainPlugins } from './plugins/fountainPlugin';
import { fountainParser, fountainSerializer } from '@stagistic/editor-core';
import EditorToolbar from './components/EditorToolbar';
import { FountainLeaf } from './utils/fountainMarks';

const SAMPLE_FOUNTAIN = `INT. WRITERS' ROOM - DAY

A sunlit table is strewn with notebooks.
!SOMETHING IS COMMING TO LIFE
Someone types **rapidly** on a laptop.

SAM
(softly)
We need a simple editor before we build the real thing.
But in the future, it will be amazing.

ALEX (voiceover)^
Let's keep it line-based for now.

~A gentle hum fills the space.

CUT TO:

EXT. STREET - NIGHT
Rain taps the sidewalk.`;

type EditorProps = {
  initialValue?: SlateValue;
  onValueChange?: (value: SlateValue) => void;
  onManualSave?: (value: SlateValue) => void;
};

const Editor = ({ initialValue, onValueChange, onManualSave }: EditorProps) => {
  const defaultValue = useMemo(() => fountainParser(SAMPLE_FOUNTAIN), []);
  const resolvedInitialValue = initialValue ?? defaultValue;
  const [serializedValue, setSerializedValue] = useState(
    fountainSerializer(resolvedInitialValue)
  );
  const latestValueRef = useRef<Value>(resolvedInitialValue as Value);

  const plugins = useMemo(() => createFountainPlugins(), []);
  const editor = usePlateEditor({
    plugins,
    value: resolvedInitialValue as Value,
  });
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateShellOffset = () => {
      if (!shellRef.current) return;
      const { left } = shellRef.current.getBoundingClientRect();
      shellRef.current.style.setProperty('--editor-left', `${left}px`);
    };

    updateShellOffset();
    window.addEventListener('resize', updateShellOffset);

    return () => {
      window.removeEventListener('resize', updateShellOffset);
    };
  }, []);

  useEffect(() => {
    if (!onManualSave) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onManualSave(latestValueRef.current as SlateValue);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onManualSave]);

  return (
    <div className="editor-layout">
      <div className="editor-shell" ref={shellRef}>
        <Plate
          editor={editor}
          onValueChange={({ value }) => {
            latestValueRef.current = value as Value;
            setSerializedValue(fountainSerializer(value));
            onValueChange?.(value as SlateValue);
          }}
        >
          <EditorToolbar
            onSave={
              onManualSave ? () => onManualSave(latestValueRef.current as SlateValue) : undefined
            }
          />
          <PlateContent className="editor" spellCheck={false} renderLeaf={FountainLeaf} />
        </Plate>
      </div>
      <aside className="editor-sidebar">
        <div className="editor-sidebar__header">Fountain preview</div>
        <pre className="editor-sidebar__content">
          {serializedValue}
        </pre>
      </aside>
    </div>
  );
};

export default Editor;
