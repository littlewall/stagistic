import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
    type ScriptView,
} from '@stagistic/ui';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../global-modals/GlobalModalsProvider';
// TEMP: perf investigation
import {markViewSwitch} from '../routes/script/perfInstrumentation';

type AppHeaderProps = Pick<UIAppHeaderProps, 'onMenuAction' | 'isFullWidth'>;

export const AppHeader = (props: AppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript, openImportScript} = useGlobalModals();

    return (
        <UIAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={openNewScript}
            onImportScript={openImportScript}
        />
    );
};

type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onSelectScript' | 'onSelectView'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();

    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onSelectScript={script => void navigate(`/script/${script.id}/editor`)}
            onSelectView={(view: ScriptView) => {
                markViewSwitch(view); // TEMP: perf investigation

                void navigate(`/script/${props.currentScript.id}/${view}`);
            }}
        />
    );
};
