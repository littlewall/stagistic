import {
    Button,
    IconButton,
    Input,
    Notice,
    PanelHeader,
    ProgressCircle,
    RadioChoiceGroup,
    SearchInput,
    Select,
    SettingRow,
    SettingsGroup,
    Switch,
    Tag,
    Tooltip,
} from '@stagistic/ui';

import type {CatalogGroup} from './types';

const PlusGlyph = () => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

export const controls: CatalogGroup = {
    title: 'Controls',
    entries: [
        {
            name: 'Button',
            /*
             * Button declares no custom properties of its own: its variant
             * classes set colour and background from tokens directly. An empty
             * contract is a legitimate answer here — the override path is the
             * variant prop, not a variable — and the catalog should show that
             * honestly rather than advertise variables that do not exist.
             */
            variables: [],
            samples: [
                {label: 'primary', node: <Button>Primary</Button>},
                {label: 'secondary', node: <Button variant="secondary">Secondary</Button>},
                {label: 'ghost', node: <Button variant="ghost">Ghost</Button>},
                {label: 'danger', node: <Button variant="danger">Danger</Button>},
                {label: 'outline', node: <Button variant="outline">Outline</Button>},
                {
                    label: 'icon',
                    node: (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Menu"
                        >☰
                        </Button>
                    ),
                },
                {label: 'size sm', node: <Button size="sm">Small</Button>},
                {label: 'disabled', node: <Button isDisabled>Disabled</Button>},
            ],
        },
        {
            name: 'IconButton',
            /*
             * IconButton captures resting surface (variant), size, radius
             * (shape) and destructive tone (tone) as props reading tokens
             * directly; it declares no custom properties of its own.
             */
            variables: [],
            samples: [
                {label: 'ghost / sm', node: <IconButton aria-label="Add"><PlusGlyph /></IconButton>},
                {
                    label: 'outline / md / pill',
                    node: (
                        <IconButton
                            variant="outline"
                            size="md"
                            shape="pill"
                            aria-label="Add"
                        ><PlusGlyph />
                        </IconButton>
                    ),
                },
                {label: 'filled / sm', node: <IconButton variant="filled" aria-label="Add"><PlusGlyph /></IconButton>},
                {label: 'xs', node: <IconButton size="xs" aria-label="Add"><PlusGlyph /></IconButton>},
                {label: 'danger', node: <IconButton tone="danger" aria-label="Remove"><PlusGlyph /></IconButton>},
                {label: 'selected', node: <IconButton isSelected aria-label="Bold"><PlusGlyph /></IconButton>},
            ],
        },
        {
            name: 'SettingsGroup',
            /*
             * SettingsGroup/SettingRow/PanelHeader are layout scaffolding:
             * they set grid/flow and spacing from tokens directly and declare
             * no custom properties of their own.
             */
            variables: [],
            samples: [
                {
                    label: 'group + rows',
                    node: (
                        <SettingsGroup>
                            <SettingRow><span>First</span></SettingRow>
                            <SettingRow><span>Second</span></SettingRow>
                        </SettingsGroup>
                    ),
                },
            ],
        },
        {
            name: 'SettingRow',
            variables: [],
            samples: [{label: 'row', node: <SettingRow><span>Label</span></SettingRow>}],
        },
        {
            name: 'PanelHeader',
            variables: [],
            samples: [
                {
                    label: 'title + description',
                    node: <PanelHeader title="Layout" description="Adjust the page." />,
                }, {label: 'title only', node: <PanelHeader title="Layout" />},
            ],
        },
        {
            name: 'Notice',
            variables: [],
            samples: [
                {label: 'warning', node: <Notice variant="warning">2 numbers are missing a score PDF</Notice>},
                {label: 'error', node: <Notice variant="error">Export preview failed.</Notice>},
                {label: 'empty', node: <Notice variant="empty">No scripts yet.</Notice>},
            ],
        },
        {
            name: 'Input',
            variables: [
                '--input-bg',
                '--input-border-color',
                '--input-font-size',
                '--input-height',
                '--input-hover-bg',
                '--input-padding-inline',
                '--input-radius',
            ],
            samples: [
                {label: 'sm',
                    node: <Input
                        aria-label="Small input"
                        size="sm"
                        placeholder="Small"
                    />},
                {label: 'md',
                    node: <Input
                        aria-label="Medium input"
                        size="md"
                        placeholder="Medium"
                    />},
                {label: 'raised',
                    node: <Input
                        aria-label="Raised input"
                        variant="raised"
                        placeholder="Raised"
                    />},
                {label: 'disabled',
                    node: <Input
                        aria-label="Disabled input"
                        placeholder="Disabled"
                        disabled
                    />},
            ],
        },
        {
            name: 'Switch',
            /*
             * Switch reads shared tokens directly and declares no --switch-*
             * custom properties of its own; `variant` toggles a layout class.
             */
            variables: [],
            samples: [
                {label: 'default', node: <Switch>Enable feature</Switch>},
                {label: 'selected', node: <Switch defaultSelected>Enabled</Switch>},
                {label: 'setting', node: <Switch variant="setting">Setting row</Switch>},
                {label: 'disabled', node: <Switch isDisabled>Disabled</Switch>},
            ],
        },
        {
            name: 'Tag',
            variables: [],
            samples: [{label: 'default', node: <Tag>Draft</Tag>}],
        },
        {
            name: 'Select',
            /*
             * Select reads the shared --control-trigger-* / --menu-* families
             * rather than declaring its own namespace; `variant="form"` sets
             * those shared variables from the Select side of the contract.
             */
            variables: [],
            samples: [
                {
                    label: 'plain',
                    node: (
                        <div style={{position: 'relative'}}>
                            <Select
                                ariaLabel="Plain select"
                                value="a"
                                options={[{value: 'a', label: 'Option A'}, {value: 'b', label: 'Option B'}]}
                                onChange={() => {}}
                            />
                        </div>
                    ),
                },
                {
                    label: 'form, size lg',
                    node: (
                        <div style={{position: 'relative'}}>
                            <Select
                                ariaLabel="Form select"
                                variant="form"
                                size="lg"
                                value="a"
                                options={[{value: 'a', label: 'Option A'}, {value: 'b', label: 'Option B'}]}
                                onChange={() => {}}
                            />
                        </div>
                    ),
                },
                {
                    label: 'panel, align start',
                    node: (
                        <div style={{position: 'relative'}}>
                            <Select
                                ariaLabel="Panel select"
                                variant="panel"
                                align="start"
                                value="a"
                                options={[{value: 'a', label: 'Option A'}, {value: 'b', label: 'Option B'}]}
                                onChange={() => {}}
                            />
                        </div>
                    ),
                },
            ],
        },
        {
            name: 'RadioChoiceGroup',
            variables: [],
            samples: [
                {
                    label: 'default',
                    node: (
                        <RadioChoiceGroup
                            ariaLabel="Radio choice group"
                            value="a"
                            options={[
                                {
                                    value: 'a', label: 'Option A', description: 'First choice',
                                }, {
                                    value: 'b', label: 'Option B', description: 'Second choice',
                                },
                            ]}
                            onChange={() => {}}
                        />
                    ),
                },
            ],
        },
        {
            name: 'ProgressCircle',
            variables: [],
            samples: [{label: 'indeterminate', node: <ProgressCircle aria-label="Loading" isIndeterminate />}],
        },
        {
            name: 'Tooltip',
            variables: [],
            samples: [
                {
                    label: 'top',
                    node: (
                        <div style={{position: 'relative'}}>
                            <Tooltip label="Tooltip text">
                                <button type="button">Hover me</button>
                            </Tooltip>
                        </div>
                    ),
                }, {
                    label: 'with shortcut',
                    node: (
                        <div style={{position: 'relative'}}>
                            <Tooltip label="Save" shortcut="⌘S">
                                <button type="button">Hover me</button>
                            </Tooltip>
                        </div>
                    ),
                },
            ],
        },
        {
            name: 'SearchInput',
            variables: [
                '--search-height',
                '--search-radius',
                '--search-icon-inset',
            ],
            samples: [{label: 'md', node: <SearchInput placeholder="Search scripts" />}, {label: 'sm', node: <SearchInput size="sm" placeholder="Filter" />}],
        },
    ],
};
