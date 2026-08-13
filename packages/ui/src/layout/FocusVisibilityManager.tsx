import {useEffect} from 'react';
import {useFocusVisible} from 'react-aria';

const FOCUS_VISIBLE_ATTRIBUTE = 'data-focus-ring-visible';

export const FocusVisibilityManager = () => {
    const {isFocusVisible} = useFocusVisible({isTextInput: true});

    useEffect(() => {
        document.documentElement.toggleAttribute(
            FOCUS_VISIBLE_ATTRIBUTE,
            isFocusVisible,
        );

        return () => document.documentElement.removeAttribute(FOCUS_VISIBLE_ATTRIBUTE);
    }, [isFocusVisible]);

    return null;
};
