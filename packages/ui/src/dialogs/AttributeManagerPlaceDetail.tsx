import {
    type FormEvent,
    useEffect,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Tooltip} from '../atoms/Tooltip';
import {TrashIcon} from '../icons';
import {formControlStyles} from '../molecules/forms/formControlStyles';
import type {AttributeManagerPlace} from './AttributeManagerPlacesPanel';
import styles from './AttributeManagerPlacesPanel.module.css';
import {RemovePlaceModal} from './RemovePlaceModal';

interface AttributeManagerPlaceDetailProps {
    place: AttributeManagerPlace,
    places: AttributeManagerPlace[],
    onRenamePlace: (placeId: string, name: string) => void | Promise<unknown>,
    onDeletePlace: (placeId: string) => void | Promise<unknown>,
}

const normalizePlaceName = (name: string) => name.trim().toLocaleLowerCase();

export const AttributeManagerPlaceDetail = ({
    place,
    places,
    onRenamePlace,
    onDeletePlace,
}: AttributeManagerPlaceDetailProps) => {
    const [nameDraft, setNameDraft] = useState(place.name);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const trimmedName = nameDraft.trim();
    const normalizedName = normalizePlaceName(trimmedName);
    const isDuplicate = places.some(candidate => {
        return candidate.id !== place.id && normalizePlaceName(candidate.name) === normalizedName;
    });
    const isInvalid = trimmedName.length === 0 || isDuplicate;
    const errorId = isInvalid ? 'place-name-error' : undefined;

    useEffect(() => {
        setNameDraft(place.name);
    }, [place.id, place.name]);

    const persistName = async () => {
        if (isInvalid) {
            return;
        }

        if (trimmedName === place.name) {
            setNameDraft(place.name);

            return;
        }

        setIsRenaming(true);

        try {
            await onRenamePlace(place.id, trimmedName);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        void persistName();
    };

    const handleConfirmDelete = async () => {
        setIsRemoving(true);

        try {
            await onDeletePlace(place.id);
            setIsRemoveOpen(false);
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <>
            <header className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                    <p className={styles.detailType}>Place</p>
                    <h3 className={styles.detailTitle}>{place.name}</h3>
                </div>
                <Tooltip label={`Remove ${place.name}`} placement="left">
                    <Button
                        className={styles.deleteButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isRemoving}
                        aria-label={`Remove ${place.name}`}
                        onPress={() => setIsRemoveOpen(true)}
                    >
                        <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                    </Button>
                </Tooltip>
            </header>
            <div className={styles.detailBody}>
                <form
                    className={styles.nameForm}
                    onSubmit={handleSubmit}
                >
                    <label className={formControlStyles.label} htmlFor={`place-name-${place.id}`}>
                        Name
                    </label>
                    <input
                        id={`place-name-${place.id}`}
                        type="text"
                        className={formControlStyles.input}
                        value={nameDraft}
                        disabled={isRenaming || isRemoving}
                        aria-describedby={errorId}
                        aria-invalid={isInvalid}
                        onChange={event => setNameDraft(event.target.value)}
                        onBlur={() => void persistName()}
                    />
                    {isInvalid ? (
                        <p id="place-name-error" className={styles.error}>
                            {isDuplicate ? 'A place with this name already exists.' : 'Name cannot be empty.'}
                        </p>
                    ) : null}
                </form>
            </div>
            <RemovePlaceModal
                isOpen={isRemoveOpen}
                placeName={place.name}
                isRemoving={isRemoving}
                onClose={() => setIsRemoveOpen(false)}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};
