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
import {ContentModule} from '../modules/ContentModule';
import {InitialPagesModule} from '../modules/InitialPagesModule';
import {PageBreakModule} from '../modules/PageBreakModule';
import {useExportPreview} from '../useExportPreview';

const cloneDefaults = (): BasicExportConfig => ({
    showNotes: BASIC_DEFAULTS.showNotes,
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

export const BasicExportTemplate = ({
    config: externalConfig,
    onConfigChange,
    derive = deriveBasicExportPlan,
}: {
    config?: BasicExportConfig,
    onConfigChange?: (config: BasicExportConfig) => void,
    derive?: typeof deriveBasicExportPlan,
}) => {
    const {script, settings} = useExportContext();
    const [localConfig, setLocalConfig] = useState<BasicExportConfig>(cloneDefaults);
    const config = externalConfig ?? localConfig;
    const setConfig = (update: BasicExportConfig | ((previous: BasicExportConfig) => BasicExportConfig)) => {
        const next = typeof update === 'function' ? update(config) : update;

        if (onConfigChange) {
            onConfigChange(next);
        } else {
            setLocalConfig(next);
        }
    };
    const stableConfig = useMemo(() => config, [config]);
    const hasAutomaticBalancingBlank = useMemo(() => {
        const plan = derive(stableConfig, script);

        return willAddAutomaticBalancingBlank(plan.leadingPages, settings);
    }, [
        script,
        settings,
        stableConfig,
    ]);

    useExportPreview({
        config: stableConfig,
        derive,
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
                <ContentModule
                    value={config.showNotes}
                    onChange={showNotes => setConfig(previous => ({
                        ...previous,
                        showNotes,
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
