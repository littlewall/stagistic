import {
    formatPitch, type Pitch,
} from '@stagistic/script';

import {Button} from '../atoms/Button';
import {IconButton} from '../atoms/IconButton';
import {Tooltip} from '../atoms/Tooltip';
import {
    ChevronDownIcon,
    ChevronUpIcon,
} from '../icons';
import styles from './VocalRangeStaff.module.css';
import type {VocalRangeNote} from './VocalRangeStaff.types';

interface RangeHeaderProps {
    low: Pitch | null,
    high: Pitch | null,
    selectedNote: VocalRangeNote | null,
    onSelect: (which: VocalRangeNote) => void,
}

export const VocalRangeHeader = ({
    low,
    high,
    selectedNote,
    onSelect,
}: RangeHeaderProps) => (
    <div className={styles.rangeHeader}>
        {([['low', low], ['high', high]] as const).map(([which, pitch]) => {
            const label = which === 'low' ? 'Low' : 'High';
            const value = pitch ? formatPitch(pitch) : '—';

            return (
                <div
                    key={which}
                    className={styles.rangeHeaderItem}
                    data-selected={selectedNote === which || undefined}
                >
                    <Button
                        variant="segment"
                        size="sm"
                        className={styles.rangeHeaderButton}
                        aria-label={`Edit ${which} note ${pitch ? value : 'not set'}`}
                        aria-pressed={selectedNote === which}
                        onPress={() => onSelect(which)}
                    >
                        <span className={styles.rangeLabel}>{label}</span>
                        <strong>{value}</strong>
                    </Button>
                </div>
            );
        })}
    </div>
);

interface NoteControlsProps {
    which: VocalRangeNote,
    pitch: Pitch,
    canAdjustOctave: (which: VocalRangeNote, delta: 1 | -1) => boolean,
    canToggleAccidental: (which: VocalRangeNote, target: 1 | -1) => boolean,
    onAdjustOctave: (which: VocalRangeNote, delta: 1 | -1) => void,
    onToggleAccidental: (which: VocalRangeNote, target: 1 | -1) => void,
}

export const VocalRangeNoteControls = ({
    which,
    pitch,
    canAdjustOctave,
    canToggleAccidental,
    onAdjustOctave,
    onToggleAccidental,
}: NoteControlsProps) => (
    <footer className={styles.noteControls} data-note-editor="">
        <div
            className={styles.controlGroup}
            role="group"
            aria-label="Octave"
        >
            <Tooltip label="Octave down" isDisabled={!canAdjustOctave(which, -1)}>
                <IconButton
                    shape="pill"
                    aria-label="Octave down"
                    isDisabled={!canAdjustOctave(which, -1)}
                    onPress={() => onAdjustOctave(which, -1)}
                >
                    <ChevronDownIcon className={styles.controlIcon} aria-hidden="true" />
                </IconButton>
            </Tooltip>
            <Tooltip label="Octave up" isDisabled={!canAdjustOctave(which, 1)}>
                <IconButton
                    shape="pill"
                    aria-label="Octave up"
                    isDisabled={!canAdjustOctave(which, 1)}
                    onPress={() => onAdjustOctave(which, 1)}
                >
                    <ChevronUpIcon className={styles.controlIcon} aria-hidden="true" />
                </IconButton>
            </Tooltip>
        </div>
        <span className={styles.controlDivider} aria-hidden="true" />
        <div
            className={styles.controlGroup}
            role="group"
            aria-label="Accidental"
        >
            <Tooltip label="Flat" isDisabled={!canToggleAccidental(which, -1)}>
                <IconButton
                    shape="pill"
                    isSelected={pitch.alter === -1}
                    aria-label="Flat"
                    aria-pressed={pitch.alter === -1}
                    isDisabled={!canToggleAccidental(which, -1)}
                    onPress={() => onToggleAccidental(which, -1)}
                >
                    <span className={styles.accidentalIcon} aria-hidden="true">♭</span>
                </IconButton>
            </Tooltip>
            <Tooltip label="Sharp" isDisabled={!canToggleAccidental(which, 1)}>
                <IconButton
                    shape="pill"
                    isSelected={pitch.alter === 1}
                    aria-label="Sharp"
                    aria-pressed={pitch.alter === 1}
                    isDisabled={!canToggleAccidental(which, 1)}
                    onPress={() => onToggleAccidental(which, 1)}
                >
                    <span className={styles.accidentalIcon} aria-hidden="true">♯</span>
                </IconButton>
            </Tooltip>
        </div>
    </footer>
);
