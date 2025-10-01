// filepath: /Users/milanzitka/git/stagistic/app/routes/app.teams.$teamId/route.tsx
import {getInputProps, useForm} from '@conform-to/react';
import {parseWithValibot} from '@conform-to/valibot';
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Divider,
    Flex,
    Group,
    Paper,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    ActionFunctionArgs,
    LoaderFunctionArgs,
} from '@remix-run/node';
import {
    data,
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
    useSubmit,
} from '@remix-run/react';
import {
    ArrowLeft,
    Edit,
    Mail,
    Save,
    Trash,
    UserMinus,
    UserPlus,
    X,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {teamFormSchema} from 'schemas/forms/team';

import {authenticate} from '~lib/auth/auth-session.server';
import {
    clearOtp,
    generateAndSendOtp,
    generateRequestId,
    validateOtp,
} from '~lib/auth/otp.server';
import {Team} from '~lib/db/entities/Team';
import {resolveEntityManager} from '~lib/db/orm';
import {commitSession, getSession} from '~lib/session.server';
import {redirectWithToast} from '~lib/toast/toast.server';

interface TeamMember {
    userId: string,
    name: string | null,
    email: string,
    role: string,
}

interface TeamDetailsData {
    team: {
        id: string,
        name: string,
    },
    isOwner: boolean,
    members: TeamMember[],
    currentUserEmail: string,
}

interface ActionData {
    success?: boolean,
    error?: string,
    formError?: string,
    otpRequired?: boolean,
    requestId?: string,
}

export const action = async ({request, params}: ActionFunctionArgs) => {
    try {
        const session = await getSession(request.headers.get('Cookie'));
        const authResult = await authenticate(request);

        if (authResult.response) {
            return authResult.response;
        }

        const user = authResult.user;
        const teamId = params.teamId;

        if (!teamId) {
            return data({error: 'Team ID is required'}, {status: 400});
        }

        const em = await resolveEntityManager();
        const team = await em.findOne(
            Team,
            {id: teamId},
            {
                populate: [
                    'owner',
                    'userTeams.user',
                    'userTeams.role',
                    'roles',
                ],
            },
        );

        if (!team) {
            return data({error: 'Team not found'}, {status: 404});
        }

        // Check if user is a member of the team
        const isMember = team.userTeams.getItems().some(ut => ut.user.id === user.user.id);

        if (!isMember) {
            return data({error: 'You are not a member of this team'}, {status: 403});
        }

        // Check if the user is the owner of the team
        const isOwner = team.owner?.id === user.user.id;
        const formData = await request.formData();
        const intent = formData.get('intent');

        // Handle team update (only for owners)
        if (intent === 'update-team') {
            if (!isOwner) {
                return data({error: 'Only the team owner can update team details'}, {status: 403});
            }

            const submission = parseWithValibot(formData, {schema: teamFormSchema});

            if (submission.status !== 'success') {
                return data({formError: 'Invalid form submission'});
            }

            // Update team
            team.name = submission.value.name;
            await em.persistAndFlush(team);

            return data({success: true});
        }

        // Handle dangerous actions with OTP verification
        if (intent === 'request-otp') {
            if (!isOwner) {
                return data({error: 'Only the team owner can perform this action'}, {status: 403});
            }

            const requestId = generateRequestId();

            await generateAndSendOtp({
                email: user.user.email,
                userId: user.user.id,
                requestId,
                session,
            });

            const cookie = await commitSession(session);

            return data(
                {
                    otpRequired: true,
                    requestId,
                },
                {
                    headers: {
                        'Set-Cookie': cookie,
                    },
                },
            );
        }

        if (intent === 'verify-otp') {
            if (!isOwner) {
                return data({error: 'Only the team owner can perform this action'}, {status: 403});
            }

            const otp = formData.get('otp') as string;
            const requestId = formData.get('requestId') as string;
            const action = formData.get('action') as string;

            const validation = validateOtp({
                session,
                otp,
                userId: user.user.id,
                requestId,
            });

            if (!validation.valid) {
                const cookie = await commitSession(session);

                return data(
                    {error: validation.error || 'Invalid OTP'},
                    {
                        status: 400,
                        headers: {
                            'Set-Cookie': cookie,
                        },
                    },
                );
            }

            clearOtp(session);

            // Handle different dangerous actions
            if (action === 'delete-team') {
                // First, remove all relationships in a transaction
                await em.transactional(em => {
                    // Remove user team associations
                    const userTeams = team.userTeams.getItems();

                    for (const userTeam of userTeams) {
                        em.remove(userTeam);
                    }

                    // Remove role associations
                    const roles = team.roles.getItems();

                    for (const role of roles) {
                        em.remove(role);
                    }
                });

                // Finally delete the team
                await em.removeAndFlush(team);

                // Clear OTP and redirect with success message
                const cookie = await commitSession(session);

                return redirectWithToast(
                    '/app/teams/overview',
                    `Team "${team.name}" has been successfully deleted.`,
                    'success',
                    {
                        headers: {
                            'Set-Cookie': cookie,
                        },
                    },
                );
            }

            const cookie = await commitSession(session);

            return data(
                {error: 'Unknown action'},
                {
                    status: 400,
                    headers: {
                        'Set-Cookie': cookie,
                    },
                },
            );
        }

        return data({error: 'Invalid action'}, {status: 400});
    } catch (error) {
        console.error('Team action error:', error);

        return data({
            error: 'An error occurred while processing your request.',
        }, {status: 500});
    }
};

export const loader = async ({request, params}: LoaderFunctionArgs) => {
    try {
        const {user, response} = await authenticate(request);

        if (response) {
            return response;
        }

        const teamId = params.teamId;

        if (!teamId) {
            return redirectWithToast('/app/teams/overview', 'Team ID is required', 'error');
        }

        const em = await resolveEntityManager();
        const team = await em.findOne(
            Team,
            {id: teamId},
            {
                populate: [
                    'owner',
                    'userTeams.user',
                    'userTeams.role',
                ],
            },
        );

        if (!team) {
            return redirectWithToast('/app/teams/overview', 'Team not found', 'error');
        }

        // Check if user is a member of the team
        const isMember = team.userTeams.getItems().some(ut => ut.user.id === user.user.id);

        if (!isMember) {
            return redirectWithToast(
                '/app/teams/overview',
                'You are not a member of this team',
                'error',
            );
        }

        // Get team members
        const members = team.userTeams.getItems().map(ut => ({
            userId: ut.user.id,
            name: ut.user.name || null,
            email: ut.user.email,
            role: ut.role.name,
        }));

        return data({
            team: {
                id: team.id,
                name: team.name,
            },
            isOwner: team.owner?.id === user.user.id,
            members,
            currentUserEmail: user.user.email,
        });
    } catch (error) {
        console.error('Team details error:', error);

        return redirectWithToast(
            '/app/teams/overview',
            'An error occurred while loading team details.',
            'error',
        );
    }
};

const TeamDetailsRoute = () => {
    const {
        team,
        isOwner,
        members,
        currentUserEmail,
    } = useLoaderData<TeamDetailsData>();
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const submit = useSubmit();
    const isSubmitting = navigation.state === 'submitting';

    const [isEditing, setIsEditing] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    // Form for editing team name
    const [form, fields] = useForm({
        id: 'team-edit-form',
        onValidate({formData}) {
            return parseWithValibot(formData, {schema: teamFormSchema});
        },
        defaultValue: {name: team.name},
        shouldRevalidate: 'onBlur',
    });

    // Handle OTP request response and form submission results
    useEffect(() => {
        if (actionData?.otpRequired) {
            setShowOtpInput(true);
        }

        if (actionData?.success) {
            // Reset states based on what action was completed
            setShowOtpInput(false);

            // If editing was successful, exit editing mode
            if (isEditing) {
                setIsEditing(false);
            }

            // Clear any pending actions (like team deletion)
            setPendingAction(null);
        }
    }, [actionData, isEditing]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleDeleteTeam = () => {
        setPendingAction('delete-team');

        const formData = new FormData();

        formData.append('intent', 'request-otp');
        submit(formData, {method: 'post'});
    };

    const handleVerifyOtp = () => {
        if (!actionData?.requestId || !pendingAction) return;

        const formData = new FormData();

        formData.append('intent', 'verify-otp');
        formData.append('otp', otp.trim()); // Trim whitespace from OTP
        formData.append('requestId', actionData.requestId);
        formData.append('action', pendingAction);

        submit(formData, {method: 'post'});
    };

    return (
        <>
            <Group justify="space-between" mb="md">
                <Group>
                    <Button
                        component={Link}
                        to="/app/teams/overview"
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                    >
                        Back to Teams
                    </Button>
                    <Title order={2}>Team Details</Title>
                </Group>

                {isOwner && !isEditing && (
                    <Group>
                        <Button
                            leftSection={<Edit size={16} />}
                            variant="outline"
                            onClick={handleEdit}
                        >
                            Edit Team
                        </Button>
                        <Button
                            leftSection={<Trash size={16} />}
                            variant="filled"
                            color="red"
                            onClick={handleDeleteTeam}
                        >
                            Delete Team
                        </Button>
                    </Group>
                )}
            </Group>

            {/* Error messages */}
            {actionData?.error && !showOtpInput && (
                <Paper p="md" withBorder mb="md" bg="red.0">
                    <Text c="red.7">{actionData.error}</Text>
                </Paper>
            )}

            {/* OTP Verification */}
            {showOtpInput && (
                <Paper p="md" withBorder mb="md">
                    <Stack>
                        <Text fw={500}>Verification Required</Text>
                        <Text size="sm">
                            For security purposes, we've sent a verification code to your email address: {currentUserEmail}
                        </Text>
                        <Flex gap="md">
                            <TextInput
                                placeholder="Enter verification code"
                                value={otp}
                                onChange={e => setOtp(e.currentTarget.value.trim())}
                                style={{flexGrow: 1}}
                                maxLength={4}
                                pattern="[0-9]{4}"
                            />
                            <Button onClick={handleVerifyOtp} loading={isSubmitting}>
                                Verify
                            </Button>
                            <Button
                                variant="subtle"
                                color="gray"
                                onClick={() => {
                                    setShowOtpInput(false);
                                    setPendingAction(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </Flex>
                        {actionData?.error && showOtpInput && (
                            <Text c="red" size="sm">{actionData.error}</Text>
                        )}
                    </Stack>
                </Paper>
            )}

            <Card withBorder radius="md" mb="md">
                <Stack>
                    <Group>
                        <Text fw={700} size="sm" c="dimmed">Team Details</Text>
                        {isOwner && (
                            <Badge color="green">Owner</Badge>
                        )}
                    </Group>

                    <Divider />

                    {isEditing ? (
                        <Form method="post" id={form.id}>
                            <input type="hidden" name="intent" value="update-team" />
                            <Stack>
                                <TextInput
                                    label="Team Name"
                                    placeholder="Enter team name"
                                    required
                                    {...getInputProps(fields.name, {type: 'text'})}
                                />
                                {fields.name.errors && (
                                    <Text c="red" size="sm">{fields.name.errors}</Text>
                                )}
                                {actionData?.formError && (
                                    <Text c="red" size="sm">{actionData.formError}</Text>
                                )}
                                <Group justify="flex-end">
                                    <Button
                                        variant="subtle"
                                        onClick={handleCancelEdit}
                                        disabled={isSubmitting}
                                        leftSection={<X size={16} />}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="filled"
                                        loading={isSubmitting}
                                        leftSection={<Save size={16} />}
                                    >
                                        Save Changes
                                    </Button>
                                </Group>
                            </Stack>
                        </Form>
                    ) : (
                        <Group>
                            <Text fw={500}>Name:</Text>
                            <Text>{team.name}</Text>
                        </Group>
                    )}
                </Stack>
            </Card>

            <Card withBorder radius="md">
                <Stack>
                    <Group justify="space-between">
                        <Text fw={700} size="sm" c="dimmed">Team Members ({members.length})</Text>
                        {isOwner && (
                            <Button
                                variant="light"
                                size="xs"
                                leftSection={<UserPlus size={16} />}
                            >
                                Invite Member
                            </Button>
                        )}
                    </Group>

                    <Divider />

                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name / Email</Table.Th>
                                <Table.Th>Role</Table.Th>
                                {isOwner && <Table.Th style={{width: '100px'}}>Actions</Table.Th>}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {members.map(member => (
                                <Table.Tr key={member.userId}>
                                    <Table.Td>
                                        <Stack gap="xs">
                                            <Text fw={500}>{member.name || 'No name'}</Text>
                                            <Group gap="xs">
                                                <Mail size={14} />
                                                <Text size="sm">{member.email}</Text>
                                            </Group>
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={member.role === 'admin' ? 'blue' : 'gray'} variant="light">
                                            {member.role}
                                        </Badge>
                                    </Table.Td>
                                    {isOwner && (
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Tooltip label="Remove Member">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        disabled={member.email === currentUserEmail}
                                                    >
                                                        <UserMinus size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    )}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Stack>
            </Card>
        </>
    );
};

export default TeamDetailsRoute;
