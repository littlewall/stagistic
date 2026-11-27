import {useToastController} from '@stagistic/ui';
import {useEffect} from 'react';

import {RESTORE_DISCARDED_MESSAGE, takeRestoreDiscarded} from './restoreNotice';

/** Tells the user, once after start, that a staged restore was dropped. */
export const RestoreDiscardedNotice = () => {
    const {addToast} = useToastController();

    useEffect(() => {
        if (takeRestoreDiscarded()) {
            addToast({title: RESTORE_DISCARDED_MESSAGE, variant: 'error'});
        }
    }, [addToast]);

    return null;
};
