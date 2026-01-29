
import { FountainNodeType } from '@stagistic/editor-core';
import { createSlatePlugin } from 'platejs';
import { FountainElement } from '../components/FountainElement';

export const fountainPlugins = [
    createSlatePlugin({
        key: FountainNodeType.sceneHeading,
        node: {
            type: FountainNodeType.sceneHeading,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.action,
        node: {
            type: FountainNodeType.action,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.centered,
        node: {
            type: FountainNodeType.centered,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.character,
        node: {
            type: FountainNodeType.character,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.parenthetical,
        node: {
            type: FountainNodeType.parenthetical,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.dialogue,
        node: {
            type: FountainNodeType.dialogue,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.lyric,
        node: {
            type: FountainNodeType.lyric,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.transition,
        node: {
            type: FountainNodeType.transition,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.section,
        node: {
            type: FountainNodeType.section,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.synopsis,
        node: {
            type: FountainNodeType.synopsis,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.note,
        node: {
            type: FountainNodeType.note,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.pageBreak,
        node: {
            type: FountainNodeType.pageBreak,
            isElement: true,
            isVoid: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.boneyard,
        node: {
            type: FountainNodeType.boneyard,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.dialogueBlock,
        node: {
            type: FountainNodeType.dialogueBlock,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.dualDialogue,
        node: {
            type: FountainNodeType.dualDialogue,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.titlePage,
        node: {
            type: FountainNodeType.titlePage,
            isElement: true,
            component: FountainElement,
        },
    }),
    createSlatePlugin({
        key: FountainNodeType.titlePageField,
        node: {
            type: FountainNodeType.titlePageField,
            isElement: true,
            component: FountainElement,
        },
    }),
];
