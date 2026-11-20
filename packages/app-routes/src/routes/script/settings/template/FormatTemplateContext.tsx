import type {FormatTemplate, PdfFlowPreset} from '@stagistic/script';
import {createContext, useContext} from 'react';

export interface FormatTemplateContextValue {
    template: FormatTemplate | undefined,
    /** Opens the template picker on the applied template. */
    change: () => void,
    /** Opens the template picker on Stagistic Default. */
    resetToDefault: () => void,
    unlock: () => void,
    updatePdfFlow?: (patch: Partial<PdfFlowPreset>) => void,
}

export const FormatTemplateContext = createContext<FormatTemplateContextValue>({
    template: undefined,
    change: () => {},
    resetToDefault: () => {},
    unlock: () => {},
});
export const useFormatTemplate = () => useContext(FormatTemplateContext);
