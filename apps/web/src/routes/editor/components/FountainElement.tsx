import { useMemo, useState } from 'react';
import clsx from 'clsx';
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
import styles from './FountainElement.module.css';

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
    [FountainNodeType.sceneHeading]: styles.sceneHeading,
    [FountainNodeType.action]: styles.action,
    [FountainNodeType.centered]: styles.centered,
    [FountainNodeType.character]: styles.character,
    [FountainNodeType.parenthetical]: styles.parenthetical,
    [FountainNodeType.dialogue]: styles.dialogue,
    [FountainNodeType.lyric]: styles.lyric,
    [FountainNodeType.transition]: styles.transition,
    [FountainNodeType.section]: styles.section,
    [FountainNodeType.synopsis]: styles.synopsis,
    [FountainNodeType.note]: styles.note,
    [FountainNodeType.pageBreak]: styles.pageBreak,
    [FountainNodeType.boneyard]: styles.boneyard,
    [FountainNodeType.dialogueBlock]: styles.dialogueBlock,
    [FountainNodeType.dualDialogue]: styles.dualDialogue,
    [FountainNodeType.titlePage]: styles.titlePage,
    [FountainNodeType.titlePageField]: styles.titlePageField,
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
        return clsx(styles.element, typeClass, props.className);
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
                <span className={styles.nodeGutter} contentEditable={false}>
                    <button
                        className={styles.nodeButton}
                        type="button"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            setOpen((prev) => !prev);
                        }}
                    >
                        ⋮
                    </button>
                    {open && (
                        <div className={styles.nodeMenu}>
                            {NODE_OPTIONS.map((option) => (
                                <button
                                    key={option.type}
                                    className={clsx(
                                        styles.nodeOption,
                                        option.type === activeType && styles.nodeOptionActive
                                    )}
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
