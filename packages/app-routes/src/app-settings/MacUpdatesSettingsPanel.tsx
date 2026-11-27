import {
    Button,
    ButtonGroup,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';

export type MacUpdateStatus =
    | {status: 'idle'}
    | {status: 'checking'}
    | {status: 'up-to-date', checkedAt: Date}
    | {status: 'downloading', release: string}
    | {status: 'ready', release: string}
    | {status: 'failed'};

interface MacUpdatesSettingsPanelProps {
    currentRelease: string,
    status: MacUpdateStatus,
    onCheckNow: () => void,
    onRestart: () => void,
    onOpenWhatsNew: () => void,
    /** Opens the full changelog on stagistic.com in the browser. */
    onOpenChangelog: (url: string) => void,
}

const CHANGELOG_URL = 'https://stagistic.com/changelog';

const formatTime = (time: Date) => time.toLocaleTimeString('en', {hour: 'numeric', minute: '2-digit'});

const statusLine = (status: MacUpdateStatus): string => {
    switch (status.status) {
        case 'checking':
            return 'Checking for updates…';
        case 'up-to-date':
            return `Up to date · checked ${formatTime(status.checkedAt)}`;
        case 'downloading':
            return 'Downloading the new version…';
        case 'ready':
            return 'New version is ready';
        case 'failed':
            return 'Couldn\'t check for updates';
        default:
            return 'Stagistic checks for updates in the background.';
    }
};

/*
 * About app tab of the Mac app: version, release notes and updates. Presentational: the controller's state and
 * actions arrive as props. Restart is always the writer's choice.
 */
export const MacUpdatesSettingsPanel = ({
    currentRelease,
    status,
    onCheckNow,
    onRestart,
    onOpenWhatsNew,
    onOpenChangelog,
}: MacUpdatesSettingsPanelProps) => (
    <SettingsGroup gap="2xl">
        <PanelHeader level={3} title="Stagistic Editor" />
        <SettingsGroup gap="lg">
            <PanelHeader level={4} size="section" title="Version" description={`Release ${currentRelease}`} />
            <ButtonGroup>
                <Button variant="outline" size="xs" onPress={onOpenWhatsNew}>What&apos;s new</Button>
                <Button variant="outline" size="xs" onPress={() => onOpenChangelog(CHANGELOG_URL)}>Full changelog</Button>
            </ButtonGroup>
        </SettingsGroup>
        <SettingsGroup gap="lg">
            <PanelHeader level={4} size="section" title="Updates" description={statusLine(status)} />
            <ButtonGroup>
                {status.status === 'ready' ? <Button size="xs" onPress={onRestart}>Restart</Button> : null}
                {status.status === 'failed' ? <Button variant="secondary" size="xs" onPress={onCheckNow}>Try again</Button> : null}
                {status.status !== 'failed' && status.status !== 'ready' ? (
                    <Button
                        variant="secondary"
                        size="xs"
                        isDisabled={status.status === 'checking' || status.status === 'downloading'}
                        onPress={onCheckNow}
                    >
                        Check now
                    </Button>
                ) : null}
            </ButtonGroup>
        </SettingsGroup>
    </SettingsGroup>
);
