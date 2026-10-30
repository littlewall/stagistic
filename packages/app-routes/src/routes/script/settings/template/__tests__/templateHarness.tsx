import type {ScriptEditorSettingsRecord, ScriptRepository} from '@stagistic/app-core';
import type {EditorSettingsOverride, FormatTemplateId} from '@stagistic/script';
import {ToastProvider} from '@stagistic/ui';
import {useState} from 'react';

import {useScriptEditorSettingsDraft} from '../../../drafts/useScriptEditorSettingsDraft';
import {ElementSettingsPanel} from '../../panels/element/ElementSettingsPanel';
import {HeaderFooterSettingsPanel} from '../../panels/header-footer/HeaderFooterSettingsPanel';
import {PageLayoutSettingsPanel} from '../../panels/page-layout/PageLayoutSettingsPanel';
import {FormatTemplateControls} from '../FormatTemplateControls';

export const makeRepository = (initialSettings: EditorSettingsOverride = {blocks: {character: {
    indentLeftChars: 2,
    shortcut: '5',
    nextElement: 'aside',
}}}, initialFormatTemplateId: FormatTemplateId | null = null) => {
    let rows: readonly ScriptEditorSettingsRecord[] = [
        {
            scriptId: 'play',
            settings: initialSettings,
            formatTemplateId: initialFormatTemplateId,
        },
    ];
    const listeners = new Set<(rows: readonly ScriptEditorSettingsRecord[]) => void>();
    const source = {
        read: () => Promise.resolve(rows),
        subscribe: (listener: (rows: readonly ScriptEditorSettingsRecord[]) => void) => {
            listeners.add(listener);
            listener(rows);

            return Promise.resolve(() => {
                listeners.delete(listener);
            });
        },
        refresh: () => {
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
    };
    const repository = {
        getScriptEditorSettingsSource: () => source,
        saveScriptSettings: (scriptId: string, settings: EditorSettingsOverride, formatTemplateId?: FormatTemplateId | null) => {
            rows = [
                {
                    scriptId,
                    settings,
                    formatTemplateId: formatTemplateId === undefined ? rows[0]?.formatTemplateId : formatTemplateId,
                },
            ];
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
        deleteScriptSettings: () => {
            rows = [];
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
    } as unknown as ScriptRepository;

    return {repository, rows: () => rows};
};

export const Harness = ({repository}: {repository: ScriptRepository}) => {
    const settings = useScriptEditorSettingsDraft({currentScriptId: 'play', repository});
    const [panel, setPanel] = useState('page');

    return (
        <ToastProvider>
            <FormatTemplateControls
                formatTemplateId={settings.formatTemplateId}
                settings={settings.resolvedScriptSettings}
                onApply={settings.applyTemplate}
                onUnlock={settings.unlockTemplate}
            >
                <button onClick={() => setPanel('page')}>Page panel</button>
                <button onClick={() => setPanel('block')}>Block panel</button>
                <button onClick={() => setPanel('header')}>Header panel</button>
                <output data-testid="indent">{settings.resolvedScriptSettings.blocks.character.indentLeftChars}</output>
                {panel === 'page' ? <PageLayoutSettingsPanel resolvedScriptSettings={settings.resolvedScriptSettings} onUpdatePageSettings={settings.updatePageSettings} /> : null}
                {panel === 'block' ? <ElementSettingsPanel blockType="character" blockLabel="Character" resolvedScriptSettings={settings.resolvedScriptSettings} shortcutPrefix="Alt" onResetBlockSettings={settings.resetBlockSettings} onUpdateBlockSettings={settings.updateBlockSettings} /> : null}
                {panel === 'header' ? <HeaderFooterSettingsPanel settings={settings.resolvedScriptSettings.headerFooter} scriptTitle="Play" titlePageSettings={{}} onUpdate={settings.updateHeaderFooterSettings} /> : null}
            </FormatTemplateControls>
        </ToastProvider>
    );
};

