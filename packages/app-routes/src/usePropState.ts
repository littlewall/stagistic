import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useState,
} from 'react';

/** Keep a local input draft, replacing it when its confirmed value changes. */
export const usePropState = <T>(confirmed: T): [T, Dispatch<SetStateAction<T>>] => {
    const [state, setState] = useState({confirmed, value: confirmed});

    if (!Object.is(state.confirmed, confirmed)) {
        setState({confirmed, value: confirmed});
    }

    const setValue = useCallback((update: SetStateAction<T>) => {
        setState(previous => ({
            ...previous,
            value: typeof update === 'function'
                ? (update as (value: T) => T)(previous.value)
                : update,
        }));
    }, []);

    return [Object.is(state.confirmed, confirmed) ? state.value : confirmed, setValue];
};
