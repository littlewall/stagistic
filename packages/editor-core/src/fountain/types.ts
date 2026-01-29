export const FountainNodeType = {
    titlePage: 'title-page',
    titlePageField: 'title-page-field',
    sceneHeading: 'scene-heading',
    action: 'action',
    character: 'character',
    dialogue: 'dialogue',
    parenthetical: 'parenthetical',
    transition: 'transition',
    lyric: 'lyric',
    section: 'section',
    synopsis: 'synopsis',
    note: 'note',
    pageBreak: 'page-break',
    boneyard: 'boneyard',
    dualDialogue: 'dual-dialogue',
    dialogueBlock: 'dialogue-block',
    centered: 'centered',
} as const;

export type FountainNodeTypeKey = keyof typeof FountainNodeType;
export type FountainNodeTypeValue = (typeof FountainNodeType)[FountainNodeTypeKey];

export type FountainTextNode = {
    text: string;
};

export type FountainTitlePageFieldNode = {
    type: typeof FountainNodeType.titlePageField;
    key: string;
    value: string[];
    children: FountainTextNode[];
};

export type FountainTitlePageNode = {
    type: typeof FountainNodeType.titlePage;
    children: FountainTitlePageFieldNode[];
};

export type FountainSectionNode = {
    type: typeof FountainNodeType.section;
    level: number;
    children: FountainTextNode[];
};

export type FountainSynopsisNode = {
    type: typeof FountainNodeType.synopsis;
    children: FountainTextNode[];
};

export type FountainSceneHeadingNode = {
    type: typeof FountainNodeType.sceneHeading;
    forced?: boolean;
    sceneNumber?: string;
    children: FountainTextNode[];
};

export type FountainActionNode = {
    type: typeof FountainNodeType.action;
    forced?: boolean;
    children: FountainTextNode[];
};

export type FountainCenteredNode = {
    type: typeof FountainNodeType.centered;
    children: FountainTextNode[];
};

export type FountainCharacterNode = {
    type: typeof FountainNodeType.character;
    forced?: boolean;
    dual?: boolean;
    children: FountainTextNode[];
};

export type FountainParentheticalNode = {
    type: typeof FountainNodeType.parenthetical;
    children: FountainTextNode[];
};

export type FountainDialogueNode = {
    type: typeof FountainNodeType.dialogue;
    children: FountainTextNode[];
};

export type FountainLyricNode = {
    type: typeof FountainNodeType.lyric;
    children: FountainTextNode[];
};

export type FountainTransitionNode = {
    type: typeof FountainNodeType.transition;
    forced?: boolean;
    children: FountainTextNode[];
};

export type FountainNoteNode = {
    type: typeof FountainNodeType.note;
    children: FountainTextNode[];
};

export type FountainPageBreakNode = {
    type: typeof FountainNodeType.pageBreak;
    children: FountainTextNode[];
};

export type FountainBoneyardNode = {
    type: typeof FountainNodeType.boneyard;
    children: FountainTextNode[];
};

export type FountainDialogueBlockNode = {
    type: typeof FountainNodeType.dialogueBlock;
    children: Array<
        FountainCharacterNode | FountainParentheticalNode | FountainDialogueNode | FountainLyricNode
    >;
};

export type FountainDualDialogueNode = {
    type: typeof FountainNodeType.dualDialogue;
    children: FountainDialogueBlockNode[];
};

export type FountainBlockNode =
    | FountainTitlePageNode
    | FountainTitlePageFieldNode
    | FountainSectionNode
    | FountainSynopsisNode
    | FountainSceneHeadingNode
    | FountainActionNode
    | FountainCenteredNode
    | FountainCharacterNode
    | FountainParentheticalNode
    | FountainDialogueNode
    | FountainLyricNode
    | FountainTransitionNode
    | FountainNoteNode
    | FountainPageBreakNode
    | FountainBoneyardNode
    | FountainDialogueBlockNode
    | FountainDualDialogueNode;

export type FountainDocument = FountainBlockNode[];
