import type {EditorSettings} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    useEffect,
} from 'react';

type UsePaginationSettingsArgs = {
    editor: TiptapEditor | null,
    resolvedSettings: EditorSettings,
    renderScale: number,
};

export const usePaginationSettings = ({
    editor,
    resolvedSettings,
    renderScale,
}: UsePaginationSettingsArgs) => {
    useEffect(() => {
        if (!editor) {
            return;
        }

        const {page, typography} = resolvedSettings;
        const scaleValue = (value: number) => value * renderScale;
        const lineHeightPx = scaleValue(typography.fontSizePx * typography.lineHeight);

        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {
                pageHeight: number,
                pageWidth: number,
                marginTop: number,
                marginBottom: number,
                marginLeft: number,
                marginRight: number,
                lineHeightPx: number,
                dividerColor: string,
                dividerThickness: number,
                dividerInsetPx: number,
            }) => boolean,
        };

        commands.updatePaginationSettings?.({
            pageHeight: scaleValue(page.heightPx),
            pageWidth: scaleValue(page.widthPx),
            marginTop: scaleValue(page.marginTopPx),
            marginBottom: scaleValue(page.marginBottomPx),
            marginLeft: scaleValue(page.marginLeftPx),
            marginRight: scaleValue(page.marginRightPx),
            lineHeightPx,
            dividerColor: 'var(--color-divider)',
            dividerThickness: 1,
            dividerInsetPx: scaleValue(96),
        });
    }, [
        editor,
        renderScale,
        resolvedSettings,
    ]);
};
