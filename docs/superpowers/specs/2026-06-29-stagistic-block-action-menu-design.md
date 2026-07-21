# Stagistic Block Action Menu — Editor Design

**Date:** 2026-06-29  
**Status:** Design approved; not built  
**Related:** [Stagistic Music — Editor & Data Design](2026-06-24-stagistic-music-editor-design.md)
(§3 domain rules, §4.1 one-music-per-block invariant, §5 entry, §6.1 live
music model)

## 1. Decision

Stagistic does **not** replace the operating system or browser context
menu. Right-click inside the editor keeps its native behavior on every
block.

Block-specific commands live in a new **block action menu**, opened from a
dedicated horizontal-ellipsis trigger to the left of the existing block
type / drag trigger. The two controls remain separate: changing or moving
a block is not mixed with commands that act on the block's content.

The menu is resolved from live block context. A block type may provide no
actions, different block types may provide different actions, and an
action's presence or label may vary between individual blocks of the same
type.

## 2. Scope

This spec defines:

- the trigger's placement and visibility;
- the per-block action provider contract;
- command and submenu item shapes;
- menu, submenu, pointer, and keyboard behavior;
- the first provider: music actions for `stageDirection` blocks;
- integration with the existing `EditorBlockActionsOverlay` and block
  type menu.

This spec does **not** define:

- music pairing, insertion, or persistence rules already owned by the music
  spec;
- music-pill actions (open/hit and delete), which remain in the pill menu;
- actions for block types other than `stageDirection`;
- a custom right-click surface;
- mobile or touch-specific invocation.

## 3. Control model

For the active block, the left-gutter overlay may show two independent
controls in this order:

1. **More actions** — a horizontal ellipsis (`…` / `MoreHorizontal`),
   opening the block action menu.
2. **Change block type** — the existing block-type icon and drag handle,
   unchanged.

The horizontal ellipsis distinguishes a block-scoped menu from the
vertical kebab used by an active music pill. Both controls use the existing
small square ghost-button dimensions and visual states. The action trigger
does not initiate drag; drag remains owned by the block type trigger.

The action trigger is rendered **iff** the resolved menu contains at least
one actionable leaf item after conditional items and empty submenus have
been removed. No disabled placeholder is shown. Therefore a block with no
available actions has no action trigger at all. `act` is the initial
example.

The type trigger follows its existing eligibility rules independently.
Absence of block actions must not hide or disable block type change or
drag on a block that otherwise supports them.

## 4. Action provider contract

Action availability is data, not component branching. A registry maps a
block type to a provider. The provider is a pure resolver over the current
block context:

```ts
interface BlockActionContext {
    editor: Editor,
    block: {
        id: string,
        type: BlockNodeType,
        pos: number,
        node: ProseMirrorNode,
    },
    snapshot: EditorLiveSnapshot,
}

interface BlockActionCommand {
    kind: 'command',
    id: string,
    label: string,
    icon?: ReactNode,
    run: (context: BlockActionContext) => void,
}

type BlockActionItem =
    | BlockActionCommand
    | {
        kind: 'submenu',
        id: string,
        label: string,
        icon?: ReactNode,
        items: readonly BlockActionCommand[],
    };

type BlockActionProvider = (
    context: BlockActionContext,
) => readonly BlockActionItem[];
```

The exact module boundaries are an implementation detail, but the
following invariants are not:

- providers receive block identity, position, node content, and the live
  derived snapshot;
- providers do not store editor state or menu-open state;
- items are resolved again after editor transactions affecting the active
  block or derived data, so labels and visibility do not go stale;
- commands revalidate their preconditions at execution time;
- empty submenus are removed;
- an empty resolved root hides the trigger;
- stable item ids, not labels, are used as React keys and action identity.

The registry is additive. Adding actions for a block type must not require
editing the generic menu component.

## 5. Menu behavior

Clicking the action trigger opens a compact menu anchored to that trigger.
Opening it closes the block type menu and any other exclusive editor
overlay. Opening the block type menu closes the action menu. Escape,
clicking outside, changing the active block, starting a drag, or executing
a command closes the complete menu tree.

The menu reuses the existing two-panel block-menu treatment:

- the primary panel lists top-level items;
- an item with children shows a trailing right caret;
- pointer hover or keyboard focus on that item reveals the secondary panel;
- moving to another primary item replaces or closes the secondary panel;
- the secondary panel remains open while the pointer moves from its parent
  item into the panel;
- placement flips above the trigger when required and must keep both panels
  within the editor/viewport bounds.

This is a frequent utility surface. Open and close are immediate; no
entrance, exit, or submenu transition is added. Hover, active, and focus
states use the existing menu colors.

Only leaf items execute commands. A submenu parent is navigation, not a
command.

## 6. Stage-direction music provider

Only `stageDirection` registers actions in the first implementation. It
returns one top-level submenu:

- **Music**
  - **Add music**
  - **Add out (`<open music display name>`)** — conditional

The provider first applies the music spec's one-music-atom-per-block invariant.
If the target stage direction already contains a `musicStart` or `musicOut`, it
returns no music actions. With no other registered actions, the action
trigger is therefore absent on that block.

### 6.1 Add music

`Add music` is present when the target stage direction contains no music atom.
It invokes the same create-mode flow as the music spec's `#` compose: insert
at the end of the target block, open title editing, and return focus to the
music title. Starting a new open music while another is open retains the music
spec's implicit-close behavior.

### 6.2 Add out

`Add out` is present only when all of the following are true:

- the target is a `stageDirection` with no music atom;
- the live positional music model reports an open durational music at the
  target block's end insertion position;
- that music is in the same scene and has not already been closed explicitly;
- the music is not a hit.

The visible label is `Add out (<music title>)`, using the current title from
the live music model. Whitespace-only or empty titles fall back to
`Music <number>`, producing, for example, `Add out (Music 4)`. Long titles are
truncated visually to the menu width, while the accessible name retains
the full label.

Activating the item inserts `musicOut` at the end of the target block and
closes the menu. If the music is no longer open when the command executes,
the command makes no document change.

### 6.3 Empty-state filtering

`Music` is omitted if neither child action is available. The generic menu
never renders empty submenu panels, disabled music commands, or a trigger
whose only content would be empty.

## 7. Keyboard and accessibility

- The action trigger is a real button with `aria-label="Block actions"`,
  `aria-haspopup="menu"`, and live `aria-expanded`.
- Tab can reach both gutter controls independently.
- Enter or Space opens the focused trigger.
- Up/Down moves through the current panel; Home/End jumps to its bounds.
- Right opens a focused submenu; Left returns to its parent; Escape closes
  the whole tree and restores focus to the action trigger.
- Enter or Space executes a focused leaf item.
- Pointer hover may reveal a submenu, but every operation has a keyboard
  path and does not depend on hover.
- Focus remains visible in both light and dark themes.

Right-click is intentionally absent from this interaction model. No editor
`contextmenu` handler calls `preventDefault()` for block actions.

## 8. Architecture

Extend the existing `EditorBlockActionsOverlay`; do not mount an overlay
per block. The overlay already owns active-block identity, anchoring,
outside-click behavior, exclusive overlays, and drag interaction.

Recommended component split:

- `EditorBlockActionsOverlay` — active block and coordination of the two
  triggers;
- `BlockActionTrigger` — visibility and action-menu invocation;
- `BlockActionMenu` — generic item rendering and one-level submenu state;
- `BlockTypeMenu` — the existing type chooser, renamed from the ambiguous
  `BlockActionsMenu`;
- `blockActionRegistry` — block type to provider mapping;
- `stageDirectionMusicActions` — music-specific resolution and commands;
- shared menu panel/item primitives or styles extracted from the existing
  block type menu.

The two menu instances need separate trigger/menu refs and placement state,
but share one exclusive open-menu owner. The existing type trigger's
pointer-down/drag path must remain isolated from the new action trigger.

## 9. Acceptance criteria

- Right-click anywhere in the editor opens the native OS/browser context
  menu; Stagistic does not suppress it.
- A music-free `stageDirection` shows the action trigger to the left of the
  type/drag trigger.
- Its primary menu contains `Music`; hovering or opening it shows `Add music`.
- `Add out (<name>)` appears only where an open music can be closed and uses
  the live title of that music.
- Empty music titles use `Music <number>` in the `Add out` label.
- A stage direction that already contains a music atom exposes no music actions.
- A block with no resolved actions renders no action trigger.
- Opening one gutter menu closes the other; drag closes the action menu.
- Block type change and drag behavior remain unchanged.
- Mouse and keyboard paths satisfy §7.
- Provider tests cover per-type absence, existing-atom filtering, open/hit/
  closed music states, title changes, empty-title fallback, and stale-command
  revalidation.
- Browser tests cover trigger visibility, submenu pointer traversal,
  keyboard navigation, exclusive menu state, command execution, and native
  `contextmenu` preservation.

## 10. Supersession

This spec supersedes the right-click `BlockContextMenu` proposed in §5.2
of the 2026-06-24 music spec. The music spec remains authoritative for music
domain and insertion rules; this document is authoritative for block-action
discovery, rendering, and invocation.
