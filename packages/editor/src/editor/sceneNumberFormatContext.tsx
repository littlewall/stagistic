import {DEFAULT_SCENE_NUMBER_FORMAT, type SceneNumberFormat} from '@stagistic/script';
import {createContext, useContext} from 'react';

/** Resolved (global + script) scene number format, for panels that label scenes like the editor does. */
export const EditorSceneNumberFormatContext = createContext<SceneNumberFormat>(DEFAULT_SCENE_NUMBER_FORMAT);

export const useEditorSceneNumberFormat = (): SceneNumberFormat => useContext(EditorSceneNumberFormatContext);
