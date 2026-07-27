import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
    deriveBasicExportPlan,
    willAddAutomaticBalancingBlank,
} from '@stagistic/export';
import {ExportPanel} from '@stagistic/ui';
import {
    useMemo,
    useState,
} from 'react';

import {useExportContext} from '../ExportProvider';
import {BlankPagesModule} from '../modules/BlankPagesModule';
import {CharacterFilterModule} from '../modules/CharacterFilterModule';
import {InitialPagesModule} from '../modules/InitialPagesModule';
import {PageBreakModule} from '../modules/PageBreakModule';
import {useExportPreview} from '../useExportPreview';

const cloneDefaults = (): BasicExportConfig => ({
    characterFilter: {
        ...BASIC_DEFAULTS.characterFilter,
        characterIds: [...BASIC_DEFAULTS.characterFilter.characterIds],
    },
    pageBreaks: {...BASIC_DEFAULTS.pageBreaks},
    initialPages: {
        startEachInitialPageOnOddPage: BASIC_DEFAULTS.initialPages.startEachInitialPageOnOddPage,
        showPageNumbers: BASIC_DEFAULTS.initialPages.showPageNumbers,
        charactersAndPlaces: {
            ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
        },
    },
    blankPages: {
        betweenInitialPagesAndScript: {
            ...BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript,
        },
    },
});

export const BasicExportTemplate = () => {
    const {script, settings} = useExportContext();
    const [config, setConfig] = useState<BasicExportConfig>(cloneDefaults);
    const stableConfig = useMemo(() => config, [config]);
    const hasAutomaticBalancingBlank = useMemo(() => {
        const plan = deriveBasicExportPlan(stableConfig, script);

        return willAddAutomaticBalancingBlank(plan.leadingPages, settings);
    }, [
        script,
        settings,
        stableConfig,
    ]);

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
                <InitialPagesModule
                    value={config.initialPages}
                    onChange={initialPages => setConfig(previous => ({
                        ...previous,
                        initialPages,
                    }))}
                />
                <PageBreakModule
                    value={config.pageBreaks}
                    onChange={pageBreaks => setConfig(previous => ({
                        ...previous,
                        pageBreaks,
                    }))}
                />
                <BlankPagesModule
                    value={config.blankPages}
                    hasAutomaticBalancingBlank={hasAutomaticBalancingBlank}
                    onChange={blankPages => setConfig(previous => ({
                        ...previous,
                        blankPages,
                    }))}
                />
            </ExportPanel.Options>
        </ExportPanel>
    );
};
