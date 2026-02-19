import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from '../EditorSidebar.module.css';
import type {
    CharacterGenderOption,
    EditorSidebarCharacter,
} from '../types';
import {
    DEFAULT_GENDER_LABEL,
    UNSPECIFIED_GENDER_KEY,
    UNSPECIFIED_GENDER_LABEL,
} from './constants';
import {
    getCharacterGenderIcon,
    normalizeGenderDisplayLabel,
    normalizeGenderKey,
} from './genderUtils';
import type {GenderListOption} from './types';

type UseCharacterGenderPickerStateArgs = {
    character: EditorSidebarCharacter,
    characterGenderOptions: CharacterGenderOption[],
    isGenderActionDisabled: boolean,
    onSetCharacterGender?: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender?: (label: string) => Promise<CharacterGenderOption | null>,
};

export const useCharacterGenderPickerState = ({
    character,
    characterGenderOptions,
    isGenderActionDisabled,
    onSetCharacterGender,
    onUpsertCharacterGender,
}: UseCharacterGenderPickerStateArgs) => {
    const isGenderUpdatePending = character.isGenderUpdatePending ?? false;
    const [optimisticGenderKey, setOptimisticGenderKey] = useState<string | null | undefined>(undefined);
    const effectiveGenderKey = optimisticGenderKey === undefined
        ? character.genderKey ?? null
        : optimisticGenderKey;
    const selectedGenderOption = useMemo(() => {
        if (!effectiveGenderKey) {
            return null;
        }

        return characterGenderOptions.find(option => option.key === effectiveGenderKey) ?? null;
    }, [characterGenderOptions, effectiveGenderKey]);
    const selectedGenderLabel = useMemo(
        () => selectedGenderOption
            ? normalizeGenderDisplayLabel(selectedGenderOption.label)
            : DEFAULT_GENDER_LABEL,
        [selectedGenderOption],
    );
    const selectedGenderIcon = useMemo(
        () => getCharacterGenderIcon(selectedGenderOption),
        [selectedGenderOption],
    );
    const [genderQuery, setGenderQuery] = useState('');
    const [isGenderPickerOpen, setIsGenderPickerOpen] = useState(false);
    const isCommittingGenderRef = useRef(false);

    useEffect(() => {
        if (optimisticGenderKey === undefined) {
            return;
        }

        if ((character.genderKey ?? null) === optimisticGenderKey) {
            setOptimisticGenderKey(undefined);

            return;
        }

        if (!isGenderUpdatePending) {
            setOptimisticGenderKey(undefined);
        }
    }, [
        character.genderKey,
        isGenderUpdatePending,
        optimisticGenderKey,
    ]);

    const genderListOptions = useMemo<GenderListOption[]>(
        () => [
            {
                id: UNSPECIFIED_GENDER_KEY,
                key: UNSPECIFIED_GENDER_KEY,
                label: normalizeGenderDisplayLabel(UNSPECIFIED_GENDER_LABEL),
                isUnspecified: true,
            }, ...characterGenderOptions.map(option => ({
                ...option,
                label: normalizeGenderDisplayLabel(option.label),
            })),
        ],
        [characterGenderOptions],
    );
    const normalizedGenderInputLabel = useMemo(
        () => normalizeGenderDisplayLabel(genderQuery),
        [genderQuery],
    );
    const normalizedGenderInputKey = useMemo(
        () => normalizeGenderKey(normalizedGenderInputLabel),
        [normalizedGenderInputLabel],
    );
    const existingGenderOption = useMemo(() => {
        if (normalizedGenderInputLabel.length === 0) {
            return null;
        }

        return characterGenderOptions.find(option => option.key === normalizedGenderInputKey) ?? null;
    }, [
        characterGenderOptions,
        normalizedGenderInputKey,
        normalizedGenderInputLabel,
    ]);
    const canCreateCustomGender = normalizedGenderInputLabel.length > 0
        && !existingGenderOption
        && Boolean(onUpsertCharacterGender);

    const applyGenderOption = (nextKey: string | null) => {
        if (!character.id || isGenderActionDisabled) {
            return;
        }

        setGenderQuery('');

        if (nextKey !== effectiveGenderKey) {
            setOptimisticGenderKey(nextKey);
            onSetCharacterGender?.(character.id, nextKey);
        }

        setIsGenderPickerOpen(false);
    };

    const shouldCloseGenderPopover = (target: Element) => {
        const isInsideGenderOverlay = Boolean(
            target.closest(`.${styles.characterGenderPickerDialog}`)
            || target.closest(`.${styles.characterGenderListBox}`)
            || target.closest(`.${styles.characterGenderQueryInput}`),
        );

        if (isInsideGenderOverlay) {
            return false;
        }

        setIsGenderPickerOpen(false);
        setGenderQuery('');

        return true;
    };

    const commitGenderQuery = async () => {
        if (isGenderActionDisabled || !character.id || isCommittingGenderRef.current) {
            return false;
        }

        const normalizedLabel = normalizedGenderInputLabel;

        if (normalizedLabel.length === 0) {
            return false;
        }

        if (!canCreateCustomGender || !onUpsertCharacterGender) {
            return false;
        }

        isCommittingGenderRef.current = true;

        try {
            const createdOption = await onUpsertCharacterGender(normalizedLabel);

            if (!createdOption) {
                return false;
            }

            applyGenderOption(createdOption.key);

            return true;
        } finally {
            isCommittingGenderRef.current = false;
        }
    };

    const handleGenderSelection = (nextKey: string) => {
        if (!character.id || isGenderActionDisabled) {
            return;
        }

        if (nextKey === UNSPECIFIED_GENDER_KEY) {
            setOptimisticGenderKey(null);
            onSetCharacterGender?.(character.id, null);
            setGenderQuery('');
            setIsGenderPickerOpen(false);

            return;
        }

        const selectedOption = characterGenderOptions.find(option => option.key === nextKey);

        if (!selectedOption) {
            return;
        }

        if (selectedOption.key === effectiveGenderKey) {
            setOptimisticGenderKey(null);
            onSetCharacterGender?.(character.id, null);
            setGenderQuery('');
            setIsGenderPickerOpen(false);

            return;
        }

        applyGenderOption(selectedOption.key);
    };

    return {
        effectiveGenderKey,
        selectedGenderLabel,
        selectedGenderIcon,
        genderQuery,
        setGenderQuery,
        isGenderPickerOpen,
        setIsGenderPickerOpen,
        genderListOptions,
        normalizedGenderInputLabel,
        canCreateCustomGender,
        shouldCloseGenderPopover,
        commitGenderQuery,
        handleGenderSelection,
    };
};
