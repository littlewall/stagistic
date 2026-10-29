import {getScriptBlockNodeType, type ScriptNode} from '../document';

export interface BlockSpacingEdges {
    before: boolean,
    after: boolean,
}

const contains = (node: ScriptNode, type: string): boolean => node.type === type || (node.content?.some(child => contains(child, type)) ?? false);

/** Blank paragraphs retain their own line; only padding inside a run is removed. */
export const resolveBlockSpacingGroups = (nodes: readonly ScriptNode[]): BlockSpacingEdges[] => {
    const connects = (left: ScriptNode | undefined, right: ScriptNode | undefined) => {
        if (!left || !right) return false;

        const type = getScriptBlockNodeType(left);

        return type !== 'act' && type !== 'scene'
            && type === getScriptBlockNodeType(right)
            && !contains(left, 'musicOut') && !contains(right, 'musicStart');
    };

    return nodes.map((node, index) => ({
        before: !connects(nodes[index - 1], node),
        after: !connects(node, nodes[index + 1]),
    }));
};
