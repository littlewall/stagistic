import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {
    RadioChoiceGroup,
    type RadioChoiceOption,
} from '../atoms/RadioChoiceGroup';
import {ModalDialog} from './ModalDialog';
import styles from './NewScriptModal.module.css';
import type {
    NewScriptModalProps,
    NewScriptShape,
} from './types';

const SCRIPT_SHAPE_OPTIONS: RadioChoiceOption<NewScriptShape>[] = [
    {
        value: 'multi-act',
        label: 'Multi-act',
        description: 'Starts with Act One and a scene.',
    }, {
        value: 'one-act',
        label: 'One-act',
        description: 'Starts with a scene only.',
    },
];

export const NewScriptModal = ({
    isOpen,
    onClose,
    onCreate,
}: NewScriptModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [shape, setShape] = useState<NewScriptShape>('multi-act');
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setShape('multi-act');

            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        setIsPending(true);

        try {
            await onCreate(name, shape);
        } finally {
            setIsPending(false);
        }
    }, [
        name,
        onCreate,
        shape,
    ]);
    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Create new script"
        >
            <h2 className={styles.title}>Create new script</h2>
            <p className={styles.subtitle}>
                Give your new script a working title. You can change it later.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.label} htmlFor="script-name">
                    Script name
                </label>
                <input
                    id="script-name"
                    ref={inputRef}
                    className={styles.input}
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Untitled script"
                />
                <RadioChoiceGroup
                    ariaLabel="Initial script structure"
                    className={styles.shapeOptions}
                    value={shape}
                    options={SCRIPT_SHAPE_OPTIONS}
                    onChange={setShape}
                    isDisabled={isPending}
                />
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isPending={isPending}
                    >
                        Create script
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
