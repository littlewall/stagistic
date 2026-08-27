import {
    Overlay,
    Panel,
    Stack,
    Text,
} from '@stagistic/ui';

import type {CatalogGroup} from './types';

export const primitives: CatalogGroup = {
    title: 'Primitives',
    entries: [
        {
            name: 'Stack',
            variables: ['--stack-gap'],
            samples: [
                {
                    label: 'column, gap md',
                    node: (
                        <Stack>
                            <Text>First</Text>
                            <Text>Second</Text>
                        </Stack>
                    ),
                }, {
                    label: 'row, gap xl, align center',
                    node: (
                        <Stack
                            direction="row"
                            gap="xl"
                            align="center"
                        >
                            <Text>First</Text>
                            <Text size="2xl">Second</Text>
                        </Stack>
                    ),
                },
            ],
        },
        {
            name: 'Text',
            variables: ['--text-color', '--text-size'],
            samples: [
                {label: 'body', node: <Text>Body copy</Text>},
                {label: 'muted', node: <Text variant="muted">Muted copy</Text>},
                {label: 'label', node: <Text variant="label" size="sm">Label</Text>},
                {label: 'mono', node: <Text variant="mono">mono-123</Text>},
                {label: 'size 3xl', node: <Text as="h2" size="3xl">Section title</Text>},
                {label: 'size 4xl', node: <Text as="h1" size="4xl">Page title</Text>},
                {
                    label: 'truncate',
                    node: (
                        <div style={{width: '8rem'}}>
                            <Text truncate>A line long enough to be cut off</Text>
                        </div>
                    ),
                },
            ],
        },
        {
            name: 'Panel',
            variables: [
                '--panel-bg',
                '--panel-pad',
                '--panel-edge',
            ],
            samples: [
                {label: 'shell', node: <Panel layer="shell"><Text>Shell</Text></Panel>},
                {label: 'panel', node: <Panel><Text>Panel</Text></Panel>},
                {label: 'float', node: <Panel layer="float"><Text>Float</Text></Panel>},
                {
                    label: 'borderless, pad lg',
                    node: <Panel bordered={false} padding="lg"><Text>No edge</Text></Panel>,
                },
            ],
        },
        {
            name: 'Overlay',
            variables: [
                '--overlay-bg',
                '--overlay-shadow',
                '--overlay-offset',
            ],
            samples: [
                {
                    label: 'bottom, popover',
                    node: (
                        <div style={{position: 'relative', height: '6rem'}}>
                            <Overlay>
                                <Text>Popover body</Text>
                            </Overlay>
                        </div>
                    ),
                }, {
                    label: 'right, canvas',
                    node: (
                        <div style={{position: 'relative', height: '6rem'}}>
                            <Overlay placement="right" elevation="canvas">
                                <Text>Canvas body</Text>
                            </Overlay>
                        </div>
                    ),
                },
            ],
        },
    ],
};
