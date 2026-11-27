import {
    Button,
    ModalActions,
    ModalDialog,
    ModalHeader,
} from '@stagistic/ui';

import type {UpdateCheckResult} from './updateController';

interface UpdateResultDialogProps {
    /** Null while closed. */
    result: UpdateCheckResult | null,
    currentRelease: string,
    onRestart: () => void,
    onClose: () => void,
}

const copyFor = (result: UpdateCheckResult, currentRelease: string) => {
    switch (result.kind) {
        case 'ready':
            return {title: `Release ${result.release} is ready`, description: 'Restart Stagistic Editor to use it. Your work is saved first.'};
        case 'failed':
            return {title: 'Couldn\'t check for updates', description: 'Check your connection and try again.'};
        default:
            return {title: 'You\'re up to date', description: `Release ${currentRelease} is the newest.`};
    }
};

export const UpdateResultDialog = ({
    result,
    currentRelease,
    onRestart,
    onClose,
}: UpdateResultDialogProps) => {
    const copy = result ? copyFor(result, currentRelease) : null;

    return (
        <ModalDialog isOpen={result !== null} ariaLabel="Software update" onClose={onClose}>
            {copy ? <ModalHeader title={copy.title} description={copy.description} /> : null}
            <ModalActions spacing="lg">
                {result?.kind === 'ready' ? <Button onPress={onRestart}>Restart</Button> : null}
                <Button variant="outline" data-modal-initial-focus onPress={onClose}>
                    {result?.kind === 'ready' ? 'Later' : 'OK'}
                </Button>
            </ModalActions>
        </ModalDialog>
    );
};
