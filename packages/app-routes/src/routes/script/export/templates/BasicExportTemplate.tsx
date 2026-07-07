import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
    deriveBasicExportPlan,
} from '@stagistic/export';
import {ExportPanel} from '@stagistic/ui';
import {
    useMemo,
    useState,
} from 'react';

import {useExportContext} from '../ExportProvider';
import {useExportPreview} from '../useExportPreview';
import {BlankPagesModule} from '../modules/BlankPagesModule';
import {CharacterFilterModule} from '../modules/CharacterFilterModule';
import {PageBreakModule} from '../modules/PageBreakModule';

const cloneDefaults = (): BasicExportConfig => ({
    characterFilter: {
        ...BASIC_DEFAULTS.characterFilter,
        characterIds: [...BASIC_DEFAULTS.characterFilter.characterIds],
    },
    pageBreaks: {...BASIC_DEFAULTS.pageBreaks},
    blankPages: {
        betweenTitleAndScript: {...BASIC_DEFAULTS.blankPages.betweenTitleAndScript},
    },
});

export const BasicExportTemplate = () => {
    const {script} = useExportContext();
    const [config, setConfig] = useState<BasicExportConfig>(cloneDefaults);
    const stableConfig = useMemo(() => config, [config]);

    useExportPreview({
        config: stableConfig,
        derive: deriveBasicExportPlan,
    });

    return (
        <ExportPanel>
            <ExportPanel.Input>
                <CharacterFilterModule
                    value={config.characterFilter}
                    characters={script.characters}
                    onChange={characterFilter => setConfig(previous => ({
                        ...previous,
                        characterFilter,
                    }))}
                />
            </ExportPanel.Input>
            <ExportPanel.Options>
                <PageBreakModule
                    value={config.pageBreaks}
                    onChange={pageBreaks => setConfig(previous => ({
                        ...previous,
                        pageBreaks,
                    }))}
                />
                <BlankPagesModule
                    value={config.blankPages}
                    onChange={blankPages => setConfig(previous => ({
                        ...previous,
                        blankPages,
                    }))}
                />
            </ExportPanel.Options>
        </ExportPanel>
    );
};
