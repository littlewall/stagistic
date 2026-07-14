import clsx from 'clsx';
import {
    useEffect,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Tooltip} from '../atoms/Tooltip';
import {PlusIcon} from '../icons';
import {AttributeManagerPlaceDetail} from './AttributeManagerPlaceDetail';
import styles from './AttributeManagerPlacesPanel.module.css';
import {CreatePlaceModal} from './CreatePlaceModal';

export interface AttributeManagerPlace {
    id: string,
    name: string,
}

export interface AttributeManagerPlacesPanelProps {
    places: AttributeManagerPlace[],
    isLoading?: boolean,
    onCreatePlace: (name: string) => AttributeManagerPlace | null | Promise<AttributeManagerPlace | null>,
    onRenamePlace: (placeId: string, name: string) => void | Promise<unknown>,
    onDeletePlace: (placeId: string) => void | Promise<unknown>,
}

export const AttributeManagerPlacesPanel = ({
    places,
    isLoading = false,
    onCreatePlace,
    onRenamePlace,
    onDeletePlace,
}: AttributeManagerPlacesPanelProps) => {
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const selectedPlace = places.find(place => place.id === selectedPlaceId) ?? null;

    useEffect(() => {
        const selectionStillExists = places.some(place => place.id === selectedPlaceId);

        if (selectionStillExists) {
            return;
        }

        setSelectedPlaceId(places[0]?.id ?? null);
    }, [places, selectedPlaceId]);

    const handleCreatePlace = async (name: string) => {
        const createdPlace = await onCreatePlace(name);

        if (createdPlace) {
            setSelectedPlaceId(createdPlace.id);
        }
    };

    const listStatus = isLoading ? 'Loading places...' : 'No places yet';

    return (
        <div className={styles.panel}>
            <aside className={styles.browser} aria-label="Place list">
                <div className={styles.browserHeader}>
                    <span className={styles.browserTitle}>Places</span>
                    <Tooltip label="Create place">
                        <Button
                            className={styles.addButton}
                            variant="ghost"
                            size="sm"
                            aria-label="Create place"
                            onPress={() => setIsCreateOpen(true)}
                        >
                            <PlusIcon className={styles.actionIcon} aria-hidden="true" />
                        </Button>
                    </Tooltip>
                </div>
                <div className={styles.browserList}>
                    {places.map(place => {
                        const isSelected = place.id === selectedPlaceId;

                        return (
                            <button
                                key={place.id}
                                type="button"
                                className={clsx(styles.listItem, isSelected && styles.selected)}
                                aria-pressed={isSelected}
                                onClick={() => setSelectedPlaceId(place.id)}
                            >
                                <span className={styles.placeName}>{place.name}</span>
                            </button>
                        );
                    })}
                    {places.length === 0 ? (
                        <p className={styles.emptyList}>{listStatus}</p>
                    ) : null}
                </div>
            </aside>
            <section className={styles.detail} aria-label="Place detail">
                {selectedPlace ? (
                    <AttributeManagerPlaceDetail
                        place={selectedPlace}
                        places={places}
                        onRenamePlace={onRenamePlace}
                        onDeletePlace={onDeletePlace}
                    />
                ) : (
                    <div className={styles.emptyDetail}>
                        <p>Select a place</p>
                    </div>
                )}
            </section>
            <CreatePlaceModal
                isOpen={isCreateOpen}
                existingPlaceNames={places.map(place => place.name)}
                onClose={() => setIsCreateOpen(false)}
                onCreate={handleCreatePlace}
            />
        </div>
    );
};
