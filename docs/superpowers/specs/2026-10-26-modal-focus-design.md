# Modal focus management

Implements approved audit points 3 and 4 after the application focus-visibility change.

- Retain native `<dialog>` and existing keyboard/menu interaction patterns.
- Workspace attribute/state managers share this primitive, including nested dialogs. React Aria overlays must portal inside the owning native dialog, so menus, color pickers and tooltips remain interactive in its top layer.
- `ModalDialog` accepts an explicit return target and fallback target, plus `initialFocus` and optional initial text selection. Targets may be refs, elements or resolvers.
- Snapshot the return contract when opening, never infer the opener from `document.activeElement`. A disappearing/disabled/hidden trigger falls back to the parent dialog, editor or current main region.
- Close/unmount restores once. Native restoration already at the intended target must not be repeated. Route changes and another active modal must not receive stale focus.
- Form dialogs focus their intended field. Confirmations focus the safe action. Settings focus the selected navigation item instead of the close button.
- Replace ad hoc opening focus timers with the primitive's initial-focus contract. Deliberate in-dialog editing autofocus remains supported.
- Wire persistent menu trigger targets through the application action/controller boundaries; disappearing menu items are never used as the return target.
- Browser tests cover pointer/keyboard open/close, Escape/Enter, nested dialogs, disappearing triggers, unmount, pending/hidden controls and focus-ring preservation in Chromium and WebKit.

Approach: explicit targets at modal/action boundaries and a shared native-dialog focus helper. React Aria Modal conversion remains unnecessary and would change top-layer behavior.

Overlay integration uses React Aria's documented [PortalProvider](https://react-aria.adobe.com/PortalProvider) to choose the owning dialog as container.
