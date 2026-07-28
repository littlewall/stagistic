import {MultiComboBox} from '../molecules/forms/MultiComboBox';
import type {AttributeManagerPlace} from './AttributeManagerPlacesPanel';
import styles from './AttributeManagerSceneDetail.module.css';

export interface AttributeManagerSceneDetailProps {
    places: AttributeManagerPlace[],
    selectedPlaceIds: string[],
    onChangePlaceIds: (placeIds: string[]) => void,
}

export const AttributeManagerSceneDetail = ({
    places,
    selectedPlaceIds,
    onChangePlaceIds,
}: AttributeManagerSceneDetailProps) => (
    <div className={styles.fields}>
        <MultiComboBox
            label="Places"
            placeholder="Select places"
            options={places.map(place => ({
                id: place.id,
                label: place.name,
            }))}
            value={selectedPlaceIds}
            emptyLabel={places.length === 0 ? 'No places yet' : 'No matching places'}
            onChange={onChangePlaceIds}
        />
    </div>
);
