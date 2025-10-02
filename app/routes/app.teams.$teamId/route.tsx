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

import {auth} from '~lib/auth/auth.server';
import {useEmailOTP} from '~lib/auth/useEmailOTP';
import {Team} from '~lib/db/entities/Team';
import {resolveEntityManager} from '~lib/db/orm';
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
}

export const action = async ({request, params}: ActionFunctionArgs) => {
    try {
        const authSession = await auth.api.getSession({
            headers: request.headers,
        });

        if (!authSession?.user) {
            return data({error: 'Unauthorized'}, {status: 401});
        }

        const user = authSession.user;
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
        const isMember = team.userTeams.getItems().some(ut => ut.user.id === user.id);

        if (!isMember) {
            return data({error: 'You are not a member of this team'}, {status: 403});
        }

        // Check if the user is the owner of the team
        const isOwner = team.owner?.id === user.id;
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

        // Handle dangerous actions (OTP verification happens on client side)
        if (intent === 'delete-team') {
            if (!isOwner) {
                return data({error: 'Only the team owner can perform this action'}, {status: 403});
            }

            const otpVerified = formData.get('otpVerified') === 'true';

            if (!otpVerified) {
                return data({error: 'OTP verification required'}, {status: 400});
            }

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

            return redirectWithToast(
                '/app/teams/overview',
                `Team "${team.name}" has been successfully deleted.`,
                'success',
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
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user) {
            return redirectWithToast('/auth/login', 'Please sign in', 'error');
        }

        const user = session.user;
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
        const isMember = team.userTeams.getItems().some(ut => ut.user.id === user.id);

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
            isOwner: team.owner?.id === user.id,
            members,
            currentUserEmail: user.email,
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
    const [otpError, setOtpError] = useState<string | null>(null);

    // Email OTP hook
    const {
        sendOTP,
        verifyOTP,
        isLoading: isOtpLoading,
    } = useEmailOTP({
        email: currentUserEmail,
        onSuccess: () => {
            // OTP verified successfully, now execute the pending action
            if (pendingAction === 'delete-team') {
                const formData = new FormData();

                formData.append('intent', 'delete-team');
                formData.append('otpVerified', 'true');
                submit(formData, {method: 'post'});
            }

            setShowOtpInput(false);
            setPendingAction(null);
            setOtp('');
            setOtpError(null);
        },
        onError: error => {
            setOtpError(error);
        },
    });

    // Form for editing team name
    const [form, fields] = useForm({
        id: 'team-edit-form',
        onValidate({formData}) {
            return parseWithValibot(formData, {schema: teamFormSchema});
        },
        defaultValue: {name: team.name},
        shouldRevalidate: 'onBlur',
    });

    // Handle form submission results
    useEffect(() => {
        if (actionData?.success) {
            // If editing was successful, exit editing mode
            if (isEditing) {
                setIsEditing(false);
            }
        }
    }, [actionData, isEditing]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleDeleteTeam = async () => {
        setPendingAction('delete-team');
        setOtpError(null);

        // Send OTP to user's email
        const result = await sendOTP();

        if (result.success) {
            setShowOtpInput(true);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp.trim()) {
            setOtpError('Please enter the verification code');

            return;
        }

        setOtpError(null);
        await verifyOTP(otp.trim());
    };

    const handleCancelOtp = () => {
        setShowOtpInput(false);
        setPendingAction(null);
        setOtp('');
        setOtpError(null);
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
                                onChange={e => setOtp(e.currentTarget.value)}
                                style={{flexGrow: 1}}
                                maxLength={6}
                                pattern="[0-9]{6}"
                                error={otpError}
                            />
                            <Button onClick={handleVerifyOtp} loading={isOtpLoading || isSubmitting}>
                                Verify
                            </Button>
                            <Button
                                variant="subtle"
                                color="gray"
                                onClick={handleCancelOtp}
                                disabled={isOtpLoading || isSubmitting}
                            >
                                Cancel
                            </Button>
                        </Flex>
                        {otpError && (
                            <Text c="red" size="sm">{otpError}</Text>
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
