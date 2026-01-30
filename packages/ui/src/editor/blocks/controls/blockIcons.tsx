import {
  ELEMENT_ACTION,
  ELEMENT_CENTERED,
  ELEMENT_CHARACTER,
  ELEMENT_DUAL_DIALOGUE,
  ELEMENT_DUAL_DIALOGUE_CHARACTER,
  ELEMENT_DIALOGUE,
  ELEMENT_LYRICS,
  ELEMENT_PARENTHETICAL,
  ELEMENT_SCENE_HEADING,
  ELEMENT_TRANSITION,
  type FountainElementType,
} from '@stagistic/editor-core';

const createIcon = (children: JSX.Element | JSX.Element[]) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const BLOCK_ICONS: Record<FountainElementType, JSX.Element> = {
  [ELEMENT_SCENE_HEADING]: createIcon(
    <>
      <path d="M4 8h16v10H4z" />
      <path d="M4 8l3-3h13l-3 3H4z" />
      <path d="M7 5l2 3M11 5l2 3M15 5l2 3" />
    </>
  ),
  [ELEMENT_ACTION]: createIcon(
    <>
      <path d="M5 7h14M5 12h14M5 17h10" />
    </>
  ),
  [ELEMENT_CHARACTER]: createIcon(
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c1.5-3 4-4 6-4s4.5 1 6 4" />
    </>
  ),
  [ELEMENT_DUAL_DIALOGUE_CHARACTER]: createIcon(
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M4 19c1.2-2.7 3.5-4 5.5-4" />
      <path d="M12 19c1-2.1 2.8-3.2 4.8-3.2" />
    </>
  ),
  [ELEMENT_PARENTHETICAL]: createIcon(
    <>
      <path d="M9 5c-2 2-3 4-3 7s1 5 3 7" />
      <path d="M15 5c2 2 3 4 3 7s-1 5-3 7" />
    </>
  ),
  [ELEMENT_DIALOGUE]: createIcon(
    <>
      <path d="M6 7h12a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H11l-4 3v-3H6a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z" />
    </>
  ),
  [ELEMENT_DUAL_DIALOGUE]: createIcon(
    <>
      <rect x="3" y="8" width="8" height="6" rx="2" />
      <rect x="13" y="6" width="8" height="6" rx="2" />
      <path d="M7 14l-3 2v-2" />
      <path d="M17 12l-2 2v-2" />
    </>
  ),
  [ELEMENT_TRANSITION]: createIcon(
    <>
      <path d="M5 12h12" />
      <path d="M13 8l4 4-4 4" />
    </>
  ),
  [ELEMENT_LYRICS]: createIcon(
    <>
      <path d="M10 6v9" />
      <path d="M10 6l8-2v9" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="16" cy="16" r="2" />
    </>
  ),
  [ELEMENT_CENTERED]: createIcon(
    <>
      <path d="M6 7h12M8 12h8M6 17h12" />
    </>
  ),
};
