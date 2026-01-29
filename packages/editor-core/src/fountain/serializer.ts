import {
    FountainNodeType,
    type FountainBlockNode,
    type FountainDialogueBlockNode,
    type FountainDualDialogueNode,
    type FountainTitlePageNode,
} from './types';

const joinText = (node: { children?: Array<{ text: string }> }) =>
    node.children?.map((child) => child.text).join('') ?? '';

const serializeTitlePage = (node: FountainTitlePageNode) => {
    const lines: string[] = [];
    node.children.forEach((field) => {
        const values = field.value.length > 0 ? field.value : [joinText(field)];
        if (values.length === 0) {
            lines.push(`${field.key}:`);
            return;
        }
        lines.push(`${field.key}: ${values[0]}`);
        for (let i = 1; i < values.length; i += 1) {
            lines.push(`    ${values[i]}`);
        }
    });
    return lines.join('\n');
};

const serializeDialogueBlock = (node: FountainDialogueBlockNode) => {
    const lines: string[] = [];
    node.children.forEach((child) => {
        const text = joinText(child);
        switch (child.type) {
            case FountainNodeType.character:
                lines.push(text.toUpperCase());
                break;
            case FountainNodeType.parenthetical:
                lines.push(text);
                break;
            case FountainNodeType.lyric:
                lines.push(`~${text}`);
                break;
            case FountainNodeType.dialogue:
            default:
                lines.push(text);
                break;
        }
    });
    return lines.join('\n');
};

const serializeDualDialogue = (node: FountainDualDialogueNode) =>
    node.children.map(serializeDialogueBlock).join('\n\n');

export const serializeFountain = (nodes: FountainBlockNode[]) => {
    const lines: string[] = [];

    nodes.forEach((node) => {
        switch (node.type) {
            case FountainNodeType.titlePage:
                lines.push(serializeTitlePage(node));
                lines.push('');
                break;
            case FountainNodeType.section:
                lines.push(`${'#'.repeat(node.level)} ${joinText(node)}`.trim());
                lines.push('');
                break;
            case FountainNodeType.synopsis:
                lines.push(`= ${joinText(node)}`.trim());
                lines.push('');
                break;
            case FountainNodeType.sceneHeading: {
                const number = node.sceneNumber ? ` #${node.sceneNumber}#` : '';
                const prefix = node.forced ? '.' : '';
                lines.push(`${prefix}${joinText(node)}${number}`.trim());
                lines.push('');
                break;
            }
            case FountainNodeType.transition:
                lines.push(node.forced ? `>${joinText(node)}` : joinText(node));
                lines.push('');
                break;
            case FountainNodeType.centered:
                lines.push(`>${joinText(node)}<`);
                lines.push('');
                break;
            case FountainNodeType.pageBreak:
                lines.push('===');
                lines.push('');
                break;
            case FountainNodeType.note:
                lines.push(`[[${joinText(node)}]]`);
                lines.push('');
                break;
            case FountainNodeType.boneyard:
                lines.push(joinText(node));
                lines.push('');
                break;
            case FountainNodeType.lyric:
                lines.push(`~${joinText(node)}`);
                lines.push('');
                break;
            case FountainNodeType.dialogueBlock:
                lines.push(serializeDialogueBlock(node));
                lines.push('');
                break;
            case FountainNodeType.dualDialogue:
                lines.push(serializeDualDialogue(node));
                lines.push('');
                break;
            case FountainNodeType.action:
                lines.push(node.forced ? `!${joinText(node)}` : joinText(node));
                lines.push('');
                break;
            case FountainNodeType.character:
            case FountainNodeType.parenthetical:
            case FountainNodeType.dialogue:
            case FountainNodeType.titlePageField:
            default:
                lines.push(joinText(node));
                lines.push('');
                break;
        }
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
