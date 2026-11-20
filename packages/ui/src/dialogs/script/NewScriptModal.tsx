import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useRef,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {RadioChoiceGroup, type RadioChoiceOption} from '../../atoms/RadioChoiceGroup/RadioChoiceGroup';
import {Switch} from '../../atoms/Switch/Switch';
import {LoaderOverlay} from '../../feedback/LoaderOverlay/LoaderOverlay';
import {FormSelect} from '../../molecules/forms/FormSelect/FormSelect';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './NewScriptModal.module.css';
import type {NewScriptModalProps, NewScriptShape} from './types';

const SCRIPT_SHAPE_OPTIONS: RadioChoiceOption<NewScriptShape>[] = [
    {
        value: 'multi-act',
        label: 'Multi-act',
        description: 'Starts with Act One and a scene.',
    },
    {
        value: 'one-act',
        label: 'One-act',
        description: 'Starts with a scene only.',
    },
];

export const NewScriptModal = ({
    isOpen,
    isTransitioning = false,
    formatTemplates,
    onClose,
    onCreate,
    returnFocus,
    fallbackFocus,
}: NewScriptModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [shape, setShape] = useState<NewScriptShape>('multi-act');
    const [templateId, setTemplateId] = useState('stagistic-default');
    const [lock, setLock] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const loadingMessages: string[] = [];

    if (isPending) {
        loadingMessages.push('Creating your script');
    }

    if (isTransitioning) {
        loadingMessages.push('Opening editor');
    }

    const isLoading = loadingMessages.length > 0;

    const [wasOpen, setWasOpen] = useState(isOpen);

    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);

        if (!isOpen) {
            setName('');
            setShape('multi-act');
            setTemplateId('stagistic-default');
            setLock(true);
        }
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsPending(true);

        try {
            if (formatTemplates?.length) {
                await onCreate(name, shape, {templateId, lock});
            } else {
                await onCreate(name, shape);
            }
        } finally {
            setIsPending(false);
        }
    };
    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);
    const handleClose = useCallback(() => {
        if (isLoading) {
            return;
        }

        onClose();
    }, [isLoading, onClose]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={handleClose}
            ariaLabel="Create new script"
            initialFocus={inputRef}
            returnFocus={returnFocus}
            fallbackFocus={fallbackFocus}
        >
            {isLoading ? (
                <LoaderOverlay
                    label="Preparing editor"
                    messages={loadingMessages}
                />
            ) : (
                <>
                    <ModalHeader
                        title="Create new script"
                        description="Give your new script a working title. You can change it later."
                    />
                    <form
                        className={styles.form}
                        onSubmit={handleSubmit}
                    >
                        <label
                            className={styles.label}
                            htmlFor="script-name"
                        >
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
                        />
                        {formatTemplates?.length ? <><label className={styles.label} htmlFor="new-script-template">Template</label><FormSelect id="new-script-template" ariaLabel="New script template" value={templateId} options={formatTemplates.map(template => ({value: template.id, label: template.label}))} onChange={value => setTemplateId(String(value))} /><Switch isSelected={lock} onChange={setLock}>Lock to template</Switch></> : null}
                        <ModalActions>
                            <Button type="submit">Create script</Button>
                            <Button
                                variant="ghost"
                                onPress={handleClose}
                            >
                                Cancel
                            </Button>
                        </ModalActions>
                    </form>
                </>
            )}
        </ModalDialog>
    );
};
