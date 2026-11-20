import {useState} from 'react';
import {
    Autocomplete,
    Button as RACButton,
    Input,
    Menu,
    MenuItem,
    MenuTrigger,
    Popover,
    SearchField,
} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {PlusIcon} from '../icons/ui';
import styles from './BoardAddCharacter.module.css';
import {ColorDot} from './ColorDot';

export interface BoardAddCharacterOption {
    id: string,
    name: string,
    color: string | null,
}

export interface BoardAddCharacterProps {
    /** Accessible name of the button, e.g. "Add character to scene 3". */
    label: string,
    /** Confirmed characters not on the card yet. */
    options: readonly BoardAddCharacterOption[],
    onAdd: (characterId: string) => void,
    /** Whether a typed name may become a new character; false for a name the script already uses. */
    canCreate: (name: string) => boolean,
    onCreate: (name: string) => void,
}

const CREATE_KEY = '__create__';

/** "+" after a card's characters: picks a character for the card, or creates one from a typed name. */
export const BoardAddCharacter = ({
    label,
    options,
    onAdd,
    canCreate,
    onCreate,
}: BoardAddCharacterProps) => {
    const [query, setQuery] = useState('');
    const name = query.trim();
    const needle = name.toLowerCase();
    const visible = options.filter(option => option.name.toLowerCase().includes(needle));
    const isCreatable = name !== '' && canCreate(name);

    return (
        <MenuTrigger onOpenChange={() => setQuery('')}>
            <Tooltip label="Add character" placement="bottom" delay={200}>
                <RACButton className={styles.trigger} aria-label={label}>
                    <PlusIcon aria-hidden="true" className={styles.icon} />
                </RACButton>
            </Tooltip>
            <Popover className={styles.popover} placement="bottom start" offset={6}>
                <Autocomplete inputValue={query} onInputChange={setQuery}>
                    <SearchField className={styles.search} aria-label="Find or create character" autoFocus>
                        <Input className={styles.input} placeholder="Find or create character…" />
                    </SearchField>
                    <Menu
                        className={styles.menu}
                        aria-label="Characters"
                        renderEmptyState={() => <p className={styles.empty}>{name ? 'No character matches.' : 'Every character is on the card.'}</p>}
                        onAction={key => {
                            if (key === CREATE_KEY) onCreate(name);
                            else onAdd(String(key));
                        }}
                    >
                        {visible.map(option => (
                            <MenuItem
                                key={option.id}
                                id={option.id}
                                textValue={option.name}
                                className={styles.item}
                            >
                                <ColorDot color={option.color} />
                                <span className={styles.name}>{option.name}</span>
                            </MenuItem>
                        ))}
                        {isCreatable ? (
                            <MenuItem id={CREATE_KEY} textValue={`Create ${name}`} className={styles.item}>
                                <PlusIcon aria-hidden="true" className={styles.icon} />
                                <span className={styles.name}>{`Create “${name}”`}</span>
                            </MenuItem>
                        ) : null}
                    </Menu>
                </Autocomplete>
            </Popover>
        </MenuTrigger>
    );
};
