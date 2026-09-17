import {
    formatPitch, parsePitch, type Pitch,
} from '@stagistic/script';
import {useRef} from 'react';

import {
    DEFAULT_VOCAL_RANGE_HIGH,
    DEFAULT_VOCAL_RANGE_LOW,
} from './defaultVocalRange';
import styles from './VocalRangeSection.module.css';
import {VocalRangeStaff} from './VocalRangeStaff';
import {VoiceTypeField} from './VoiceTypeField';
import {getDefaultVocalRangeForVoiceType} from './voiceTypes';

interface VocalRangeSectionCharacter {
    id: string,
    voiceType: string | null,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
}

interface VocalRangeSectionProps {
    character: VocalRangeSectionCharacter,
    onSetCharacterVoiceType?: (characterId: string, voiceType: string | null) => void,
    onSetCharacterVocalRange?: (characterId: string, low: string | null, high: string | null) => void,
}

export const VocalRangeSection = ({
    character,
    onSetCharacterVoiceType,
    onSetCharacterVocalRange,
}: VocalRangeSectionProps) => {
    const rangeTouchedCharacterIds = useRef(new Set<string>());

    if (character.vocalRangeLow !== null || character.vocalRangeHigh !== null) {
        rangeTouchedCharacterIds.current.add(character.id);
    }

    const low = (character.vocalRangeLow ? parsePitch(character.vocalRangeLow) : null)
        ?? DEFAULT_VOCAL_RANGE_LOW;
    const high = (character.vocalRangeHigh ? parsePitch(character.vocalRangeHigh) : null)
        ?? DEFAULT_VOCAL_RANGE_HIGH;

    const handleStaffChange = (which: 'low' | 'high', pitch: Pitch) => {
        rangeTouchedCharacterIds.current.add(character.id);

        const nextLow = which === 'low' ? pitch : low;
        const nextHigh = which === 'high' ? pitch : high;

        onSetCharacterVocalRange?.(
            character.id,
            formatPitch(nextLow),
            formatPitch(nextHigh),
        );
    };

    const handleVoiceTypeChange = (value: string | null) => {
        onSetCharacterVoiceType?.(character.id, value);

        if (rangeTouchedCharacterIds.current.has(character.id)) {
            return;
        }

        const defaultRange = getDefaultVocalRangeForVoiceType(value);

        if (!defaultRange) {
            return;
        }

        rangeTouchedCharacterIds.current.add(character.id);
        onSetCharacterVocalRange?.(
            character.id,
            defaultRange.low,
            defaultRange.high,
        );
    };

    return (
        <section className={styles.section}>
            <span>Vocal range</span>
            <div className={styles.fields}>
                <VoiceTypeField
                    value={character.voiceType}
                    onChange={handleVoiceTypeChange}
                />
                <VocalRangeStaff
                    key={character.id}
                    className={styles.staff}
                    interactive
                    low={low}
                    high={high}
                    onChange={handleStaffChange}
                />
            </div>
        </section>
    );
};
