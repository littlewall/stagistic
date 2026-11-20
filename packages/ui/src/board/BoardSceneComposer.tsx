import {useState} from 'react';

import {CloseIcon, EnterKeyIcon} from '../icons';
import {BoardKeyButton} from './BoardKeyButton';
import styles from './BoardSceneComposer.module.css';

/** Names a new scene before it is inserted: a card whose name is being typed. Its caller places it in the list. */
export const BoardSceneComposer = ({onSubmit, onCancel}: {
    onSubmit: (title: string) => boolean,
    onCancel: () => void,
}) => {
    const [draft, setDraft] = useState('');

    return (
        <div className={styles.card}>
            <form
                className={styles.form}
                onSubmit={event => {
                    event.preventDefault();

                    if (draft.trim()) onSubmit(draft.trim());
                }}
            >
                <input
                    autoFocus
                    aria-label="Scene name"
                    placeholder="Scene name"
                    className={styles.input}
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => {
                        if (event.nativeEvent.isComposing) {
                            if (event.key === 'Enter') event.preventDefault();

                            return;
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            onCancel();
                        }
                    }}
                />
                <BoardKeyButton type="submit" aria-label="Add scene" title="Add scene (Enter)" disabled={!draft.trim()}>
                    <EnterKeyIcon aria-hidden="true" />
                </BoardKeyButton>
                <BoardKeyButton aria-label="Cancel" title="Cancel (Esc)" onClick={onCancel}>
                    <CloseIcon aria-hidden="true" />
                </BoardKeyButton>
            </form>
        </div>
    );
};
