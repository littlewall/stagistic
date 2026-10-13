import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
    type ScriptView,
} from '@stagistic/ui';
import {useNavigate} from 'react-router-dom';

import {useCloudAccount} from '../account/CloudAccountProvider';
import {useGlobalModals} from '../global-modals/GlobalModalsProvider';

type AppHeaderProps = Pick<UIAppHeaderProps, 'contentInset' | 'isFullWidth' | 'scriptControls'> & {
    showScriptActions?: boolean,
};

export const AppHeader = ({
    showScriptActions = true,
    ...props
}: AppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript, openImportScript} = useGlobalModals();
    const {menuAccount} = useCloudAccount();

    return (
        <UIAppHeader
            {...props}
            account={menuAccount}
            onHome={() => void navigate('/')}
            onNewScript={showScriptActions ? openNewScript : undefined}
            onImportScript={showScriptActions ? openImportScript : undefined}
        />
    );
};

type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onSelectView' | 'account' | 'cloudSyncLabel'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();
    const {menuAccount, syncLabel} = useCloudAccount();

    return (
        <UIScriptEditorAppHeader
            {...props}
            account={menuAccount}
            cloudSyncLabel={syncLabel}
            onHome={() => void navigate('/')}
            onSelectView={(view: ScriptView) => void navigate(`/script/${props.currentScript.id}/${view}`)}
        />
    );
};
