import type {BlockSpec} from '@stagistic/script';
import type {ComponentType} from 'react';

/**
 * A BlockBinding pairs a script-package block spec with its
 * editor-package presentation facts: CSS class, CSS-var prefix, and icon.
 *
 * Bindings live in `packages/editor/src/editor/blocks/<blockName>/binding.ts`
 * and are collected into `ALL_BLOCK_BINDINGS`. Tiptap node definitions,
 * class-name maps, icon maps, and the CSS variable dispatcher are all
 * *derived* from this array.
 *
 * To add a new block: create a new folder under `blocks/` with a spec
 * (in the script package), a binding, a CSS module, and an icon
 * component. Append the binding to `ALL_BLOCK_BINDINGS`. See
 * docs/adding-a-block-type.md.
 */
export interface BlockBinding {
    readonly spec: BlockSpec,
    /** Block-level CSS class applied by Tiptap to <p> elements. */
    readonly cssClass: string,
    /** Prefix for the block's CSS variables (e.g. 'scene' → '--scene-*'). */
    readonly cssVarPrefix: string,
    /** React component rendering an SVG icon for toolbar/menu UI. */
    readonly icon: ComponentType,
}
