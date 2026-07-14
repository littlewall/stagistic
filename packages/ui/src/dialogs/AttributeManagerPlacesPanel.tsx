import clsx from 'clsx';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Input} from '../atoms/Input';
import {Tooltip} from '../atoms/Tooltip';
import {
    PlusIcon,
    SearchIcon,
} from '../icons';
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
    const [searchQuery, setSearchQuery] = useState('');
    const selectedPlace = places.find(place => place.id === selectedPlaceId) ?? null;
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const visiblePlaces = useMemo(() => {
        if (!normalizedSearchQuery) {
            return places;
        }

        return places.filter(place => place.name.toLocaleLowerCase().includes(normalizedSearchQuery));
    }, [normalizedSearchQuery, places]);

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
                <div className={styles.searchRow}>
                    <div className={styles.searchField}>
                        <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                        <Input
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Search places"
                            aria-label="Search places"
                        />
                    </div>
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
                    {visiblePlaces.map(place => {
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
                    {visiblePlaces.length === 0 ? (
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
