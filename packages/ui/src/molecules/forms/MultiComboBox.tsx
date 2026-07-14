import clsx from 'clsx';
import {
    Button as ComboBoxButton,
    ComboBox,
    ComboBoxValue,
    Input,
    type Key,
    Label,
    ListBox,
    ListBoxItem,
    Popover,
} from 'react-aria-components/ComboBox';
import {
    Button as RemoveButton,
    Tag,
    TagGroup,
    TagList,
} from 'react-aria-components/TagGroup';

import {
    ChevronDownIcon,
    CloseIcon,
} from '../../icons';
import styles from './MultiComboBox.module.css';

export interface MultiComboBoxOption {
    id: string,
    label: string,
}

interface MultiComboBoxProps {
    label: string,
    placeholder: string,
    options: MultiComboBoxOption[],
    value: string[],
    onChange: (value: string[]) => void,
    className?: string,
    isDisabled?: boolean,
    emptyLabel?: string,
}

const toStringKeys = (keys: Key[]) => keys.map(String);

export const MultiComboBox = ({
    label,
    placeholder,
    options,
    value,
    onChange,
    className,
    isDisabled = false,
    emptyLabel = 'No matching options',
}: MultiComboBoxProps) => (
    <ComboBox<MultiComboBoxOption, 'multiple'>
        className={clsx(styles.root, className)}
        selectionMode="multiple"
        value={value}
        isDisabled={isDisabled}
        menuTrigger="focus"
        onChange={keys => onChange(toStringKeys(keys))}
    >
        <Label className={styles.label}>{label}</Label>
        <div className={styles.field}>
            <Input className={styles.input} placeholder={placeholder} />
            <ComboBoxButton className={styles.openButton} aria-label={`Show ${label.toLocaleLowerCase()}`}>
                <ChevronDownIcon aria-hidden="true" />
            </ComboBoxButton>
        </div>
        <ComboBoxValue<MultiComboBoxOption> className={styles.value}>
            {({selectedItems}) => {
                const items = selectedItems.filter((item): item is MultiComboBoxOption => item !== null);

                if (items.length === 0) {
                    return null;
                }

                return (
                    <TagGroup
                        aria-label={`Selected ${label.toLocaleLowerCase()}`}
                        onRemove={keys => onChange(value.filter(id => !keys.has(id)))}
                    >
                        <TagList className={styles.tags} items={items}>
                            {item => (
                                <Tag
                                    id={item.id}
                                    className={styles.tag}
                                    textValue={item.label}
                                >
                                    <span>{item.label}</span>
                                    <RemoveButton slot="remove" className={styles.removeButton}>
                                        <CloseIcon aria-hidden="true" />
                                    </RemoveButton>
                                </Tag>
                            )}
                        </TagList>
                    </TagGroup>
                );
            }}
        </ComboBoxValue>
        <Popover className={styles.popover} offset={4}>
            <ListBox
                className={styles.listBox}
                items={options}
                renderEmptyState={() => <span className={styles.empty}>{emptyLabel}</span>}
            >
                {option => (
                    <ListBoxItem
                        id={option.id}
                        className={styles.option}
                        textValue={option.label}
                    >
                        {option.label}
                    </ListBoxItem>
                )}
            </ListBox>
        </Popover>
    </ComboBox>
);
