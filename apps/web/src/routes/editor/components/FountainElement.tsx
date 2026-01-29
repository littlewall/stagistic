import { useMemo, useState } from 'react';
import {
    PlateElement,
    useEditorRef,
    useElement,
    useFocused,
    useNodePath,
    useSelected,
} from 'platejs/react';
import type { TElement } from 'platejs';
import { FountainNodeType } from '@stagistic/editor-core';

type Option = {
    label: string;
    type: string;
};

const NODE_OPTIONS: Option[] = [
    { label: 'Scene Heading', type: FountainNodeType.sceneHeading },
    { label: 'Action', type: FountainNodeType.action },
    { label: 'Character', type: FountainNodeType.character },
    { label: 'Parenthetical', type: FountainNodeType.parenthetical },
    { label: 'Dialogue', type: FountainNodeType.dialogue },
    { label: 'Transition', type: FountainNodeType.transition },
    { label: 'Lyric', type: FountainNodeType.lyric },
    { label: 'Section', type: FountainNodeType.section },
    { label: 'Synopsis', type: FountainNodeType.synopsis },
    { label: 'Note', type: FountainNodeType.note },
];

const typeClassMap: Record<string, string> = {
    [FountainNodeType.sceneHeading]: 'scene-heading',
    [FountainNodeType.action]: 'action',
    [FountainNodeType.centered]: 'centered',
    [FountainNodeType.character]: 'character',
    [FountainNodeType.parenthetical]: 'parenthetical',
    [FountainNodeType.dialogue]: 'dialogue',
    [FountainNodeType.lyric]: 'lyric',
    [FountainNodeType.transition]: 'transition',
    [FountainNodeType.section]: 'section',
    [FountainNodeType.synopsis]: 'synopsis',
    [FountainNodeType.note]: 'note',
    [FountainNodeType.pageBreak]: 'page-break',
    [FountainNodeType.boneyard]: 'boneyard',
    [FountainNodeType.dialogueBlock]: 'dialogue-block',
    [FountainNodeType.dualDialogue]: 'dual-dialogue',
    [FountainNodeType.titlePage]: 'title-page',
    [FountainNodeType.titlePageField]: 'title-page-field',
};

export function FountainElement(props: Parameters<typeof PlateElement>[0]) {
    const element = useElement<TElement>();
    const editor = useEditorRef();
    const path = useNodePath(element);
    const selected = useSelected();
    const focused = useFocused();
    const [open, setOpen] = useState(false);

    const activeType = element?.type as string | undefined;
    const isActive = selected && focused;

    const className = useMemo(() => {
        const typeClass = activeType ? typeClassMap[activeType] ?? '' : '';
        return ['fountain-element', typeClass, props.className].filter(Boolean).join(' ');
    }, [activeType, props.className]);

    const handleChange = (type: string) => {
        if (!editor || !path) {
            return;
        }
        editor.tf.setNodes({ type }, { at: path });
        setOpen(false);
    };

    return (
        <PlateElement {...props} className={className}>
            {isActive && (
                <span className="editor-node-gutter" contentEditable={false}>
                    <button
                        className="editor-node-button"
                        type="button"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            setOpen((prev) => !prev);
                        }}
                    >
                        ⋮
                    </button>
                    {open && (
                        <div className="editor-node-menu">
                            {NODE_OPTIONS.map((option) => (
                                <button
                                    key={option.type}
                                    className={
                                        option.type === activeType
                                            ? 'editor-node-option active'
                                            : 'editor-node-option'
                                    }
                                    type="button"
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        handleChange(option.type);
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </span>
            )}
            {props.children}
        </PlateElement>
    );
}
