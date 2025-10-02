import {getInputProps, useForm} from '@conform-to/react';
import {parseWithValibot} from '@conform-to/valibot';
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    Paper,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
    ActionFunctionArgs,
    json,
    LoaderFunctionArgs,
} from '@remix-run/node';
import {
    data,
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
} from '@remix-run/react';
import {
    ExternalLink,
    UserPlus,
    Users,
} from 'lucide-react';
import {useEffect} from 'react';
import {teamFormSchema} from 'schemas/forms/team';

import {auth} from '~lib/auth/auth.server';
import {Role} from '~lib/db/entities/Role';
import {Team} from '~lib/db/entities/Team';
import {User} from '~lib/db/entities/User';
import {UserTeam} from '~lib/db/entities/UserTeam';
import {resolveEntityManager} from '~lib/db/orm';

import {useToastFromUrl} from './useToastFromUrl';

interface TeamData {
    id: string,
    name: string,
    role: string,
    isOwner: boolean,
}

interface LoaderData {
    teams: TeamData[],
}

interface ActionData {
    success?: boolean,
    error?: string,
    formError?: string,
}

export const action = async ({request}: ActionFunctionArgs) => {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user) {
            return json({error: 'Unauthorized'}, {status: 401});
        }

        const formData = await request.formData();
        const submission = parseWithValibot(formData, {schema: teamFormSchema});

        if (submission.status !== 'success') {
            return json({formError: 'Invalid form submission'});
        }

        const em = await resolveEntityManager();
        const userEntity = await em.findOne(User, {id: session.user.id});

        if (!userEntity) {
            return json({error: 'User not found'}, {status: 404});
        }

        const team = new Team();

        team.name = submission.value.name;
        team.owner = userEntity;

        await em.persistAndFlush(team);

        // Create admin and user roles
        const adminRole = new Role();

        adminRole.name = 'admin';
        adminRole.team = team;

        const userRole = new Role();

        userRole.name = 'user';
        userRole.team = team;

        await em.persistAndFlush([adminRole, userRole]);

        // Add current user as admin
        const userTeam = new UserTeam();

        userTeam.user = userEntity;
        userTeam.team = team;
        userTeam.role = adminRole;

        await em.persistAndFlush(userTeam);

        return json({success: true});
    } catch (error) {
        console.error('Team creation error:', error);

        return json({
            error: 'An error occurred while creating the team.',
        }, {status: 500});
    }
};

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user) {
            return json({error: 'Unauthorized'}, {status: 401});
        }

        const em = await resolveEntityManager();
        const userWithTeams = await em.findOneOrFail(User, {id: session.user.id}, {populate: ['userTeams.team', 'userTeams.role']});

        if (!userWithTeams) {
            return data({teams: []});
        }

        const teams = userWithTeams.userTeams.getItems().map(ut => ({
            id: ut.team.id,
            name: ut.team.name,
            role: ut.role.name,
            isOwner: ut.team.owner?.id === session.user.id,
        }));

        return data({teams});
    } catch (error) {
        return new Response('An error occurred while loading the teams overview.', {status: 500});
    }
};

const TeamsRoute = () => {
    const {teams} = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    // This will show toast messages from URL parameters
    useToastFromUrl();

    const [opened, {open, close}] = useDisclosure(false);

    const [form, fields] = useForm({
        id: 'team-form',
        onValidate({formData}) {
            return parseWithValibot(formData, {schema: teamFormSchema});
        },
        defaultValue: {name: ''},
        shouldRevalidate: 'onBlur',
    });

    // Reset form and close modal on successful submission
    useEffect(() => {
        if (actionData?.success) {
            close();
        }
    }, [actionData?.success, close]);

    const handleOpenModal = () => {
        open();
    };

    return (
        <>
            <Modal opened={opened} onClose={close} title="Create New Team" size="md">
                <Form method="post" id={form.id}>
                    <Stack gap="md">
                        <TextInput
                            label="Team Name"
                            placeholder="Enter team name"
                            required
                            {...getInputProps(fields.name, {type: 'text'})}
                        />
                        {fields.name.errors && (
                            <Text c="red" size="sm">{fields.name.errors}</Text>
                        )}
                        {actionData?.error && (
                            <Text c="red" size="sm">{actionData.error}</Text>
                        )}
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={close} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="filled"
                                loading={isSubmitting}
                            >
                                Create Team
                            </Button>
                        </Group>
                    </Stack>
                </Form>
            </Modal>

            <Group justify="space-between" mb="md">
                <Title order={2}>Teams Overview</Title>
                <Button
                    leftSection={<UserPlus size={16} />}
                    variant="filled"
                    onClick={handleOpenModal}
                >
                    Create New Team
                </Button>
            </Group>

            {teams.length === 0 ? (
                <Card withBorder padding="xl" radius="md">
                    <Stack align="center" gap="md">
                        <Users size={64} opacity={0.5} />
                        <Text size="xl" ta="center" fw={500}>
                            You don't have any teams yet
                        </Text>
                        <Text size="sm" ta="center" c="dimmed" maw={400}>
                            Teams allow you to collaborate with other users. Create your first team to get started.
                        </Text>
                        <Button
                            leftSection={<UserPlus size={16} />}
                            variant="filled"
                            onClick={handleOpenModal}
                        >
                            Create Your First Team
                        </Button>
                    </Stack>
                </Card>
            ) : (
                <Paper withBorder radius="md">
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Team Name</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th style={{width: '80px'}}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {teams.map(team => (
                                <Table.Tr key={team.id}>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Text fw={500}>{team.name}</Text>
                                            {team.isOwner && (
                                                <Badge color='green' variant='light' size="xs">Owner</Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={team.isOwner ? 'blue' : 'gray'} variant='light'>
                                            {team.role}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Tooltip label="View Team Details">
                                            <ActionIcon
                                                component={Link}
                                                to={`/app/teams/${team.id}`}
                                                variant="subtle"
                                                color="blue"
                                                size="md"
                                            >
                                                <ExternalLink size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Paper>
            )}
        </>
    );
};

export default TeamsRoute;
