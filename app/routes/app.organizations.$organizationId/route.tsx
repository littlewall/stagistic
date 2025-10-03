
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
import type {ActionFunctionArgs, LoaderFunctionArgs} from '@remix-run/node';
import {data} from '@remix-run/node';
import {
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

import {auth} from '~lib/auth/auth.server';
import {
    deleteOrganization,
    getOrganizationById,
    getOrganizationMember,
    listOrganizationMembers,
    updateOrganization,
} from '~lib/auth/organization.server';
import {useEmailOTP} from '~lib/auth/useEmailOTP';
import {redirectWithToast} from '~lib/toast/toast.server';
import {organizationFormSchema} from '~schemas/forms/organization';

interface OrganizationMember {
    id: string,
    userId: string,
    name: string | null,
    email: string,
    role: string,
}

interface OrganizationDetailsData {
    organization: {
        id: string,
        name: string,
        slug: string,
    },
    isOwner: boolean,
    members: OrganizationMember[],
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
        const organizationId = params.organizationId;

        if (!organizationId) {
            return data({error: 'Organization ID is required'}, {status: 400});
        }

        const organization = await getOrganizationById(organizationId);

        if (!organization) {
            return data({error: 'Organization not found'}, {status: 404});
        }

        // Check if user is a member of the organization
        const member = await getOrganizationMember(organizationId, user.id);

        if (!member) {
            return data({error: 'You are not a member of this organization'}, {status: 403});
        }

        const isOwner = member.role === 'owner';
        const formData = await request.formData();
        const intent = formData.get('intent');

        // Handle organization update (only for owners)
        if (intent === 'update-organization') {
            if (!isOwner) {
                return data({error: 'Only the organization owner can update organization details'}, {status: 403});
            }

            const submission = parseWithValibot(formData, {schema: organizationFormSchema});

            if (submission.status !== 'success') {
                return data({formError: 'Invalid form submission'});
            }

            const submissionValue = submission.value;

            // Update organization
            await updateOrganization(organizationId, {
                name: submissionValue.name,
                slug: submissionValue.slug || undefined,
            });

            return data({success: true});
        }

        // Handle dangerous actions (OTP verification happens on client side)
        if (intent === 'delete-organization') {
            if (!isOwner) {
                return data({error: 'Only the organization owner can perform this action'}, {status: 403});
            }

            const otpVerified = formData.get('otpVerified') === 'true';

            if (!otpVerified) {
                return data({error: 'OTP verification required'}, {status: 400});
            }

            // Delete the organization (cascade will handle members and invitations)
            await deleteOrganization(organizationId);

            return redirectWithToast(
                '/app/organizations/overview',
                `Organization "${organization.name}" has been successfully deleted.`,
                'success',
            );
        }

        return data({error: 'Invalid action'}, {status: 400});
    } catch (error) {
        console.error('Organization action error:', error);

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
        const organizationId = params.organizationId;

        if (!organizationId) {
            return redirectWithToast('/app/organizations/overview', 'Organization ID is required', 'error');
        }

        const organization = await getOrganizationById(organizationId);

        if (!organization) {
            return redirectWithToast('/app/organizations/overview', 'Organization not found', 'error');
        }

        // Check if user is a member of the organization
        const currentMember = await getOrganizationMember(organizationId, user.id);

        if (!currentMember) {
            return redirectWithToast(
                '/app/organizations/overview',
                'You are not a member of this organization',
                'error',
            );
        }

        // Get organization members with user details
        const members = await listOrganizationMembers(organizationId);
        const memberIds = members.map(m => m.userId);

        // Fetch user details from Better Auth's user table
        const {Pool} = await import('pg');
        const globals = await import('../../config/globals');
        const {
            user: dbUser,
            password,
            host,
            database,
        } = globals.default.get('database.postgres');

        const pool = new Pool({
            connectionString: `postgres://${dbUser}:${password}@${host}/${database}`,
        });

        interface UserDetail {
            id: string,
            name: string | null,
            email: string,
        }

        const userDetailsResult = await pool.query(
            'SELECT id, name, email FROM "user" WHERE id = ANY($1)',
            [memberIds],
        );

        void pool.end();

        const userDetailsMap = new Map<string, UserDetail>(
            userDetailsResult.rows.map((u: UserDetail) => [u.id, u]),
        );

        const membersWithDetails: OrganizationMember[] = members.map(member => {
            const userDetails = userDetailsMap.get(member.userId);

            return {
                id: member.id,
                userId: member.userId,
                name: userDetails?.name || null,
                email: userDetails?.email || 'Unknown',
                role: member.role,
            };
        });

        return data({
            organization: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
            },
            isOwner: currentMember.role === 'owner',
            members: membersWithDetails,
            currentUserEmail: user.email,
        });
    } catch (error) {
        console.error('Organization details error:', error);

        return redirectWithToast(
            '/app/organizations/overview',
            'An error occurred while loading organization details.',
            'error',
        );
    }
};

const OrganizationDetailsRoute = () => {
    const {
        organization,
        isOwner,
        members,
        currentUserEmail,
    } = useLoaderData<OrganizationDetailsData>();
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
            if (pendingAction === 'delete-organization') {
                const formData = new FormData();

                formData.append('intent', 'delete-organization');
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

    // Form for editing organization
    const [form, fields] = useForm({
        id: 'organization-edit-form',
        onValidate({formData}) {
            return parseWithValibot(formData, {schema: organizationFormSchema});
        },
        defaultValue: {
            name: organization.name,
            slug: organization.slug,
        },
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

    const handleDeleteOrganization = async () => {
        setPendingAction('delete-organization');
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
                        to="/app/organizations/overview"
                        variant="subtle"
                        leftSection={<ArrowLeft size={16} />}
                    >
                        Back to Organizations
                    </Button>
                    <Title order={2}>Organization Details</Title>
                </Group>

                {isOwner && !isEditing && (
                    <Group>
                        <Button
                            leftSection={<Edit size={16} />}
                            variant="outline"
                            onClick={handleEdit}
                        >
                            Edit Organization
                        </Button>
                        <Button
                            leftSection={<Trash size={16} />}
                            variant="filled"
                            color="red"
                            onClick={handleDeleteOrganization}
                        >
                            Delete Organization
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
                        <Text fw={700} size="sm" c="dimmed">Organization Details</Text>
                        {isOwner && (
                            <Badge color="green">Owner</Badge>
                        )}
                    </Group>

                    <Divider />

                    {isEditing ? (
                        <Form method="post" id={form.id}>
                            <input type="hidden" name="intent" value="update-organization" />
                            <Stack>
                                <TextInput
                                    label="Organization Name"
                                    placeholder="Enter organization name"
                                    required
                                    {...getInputProps(fields.name, {type: 'text'})}
                                />
                                {fields.name.errors && (
                                    <Text c="red" size="sm">{fields.name.errors}</Text>
                                )}
                                <TextInput
                                    label="Slug"
                                    placeholder="my-organization"
                                    {...getInputProps(fields.slug, {type: 'text'})}
                                />
                                {fields.slug.errors && (
                                    <Text c="red" size="sm">{fields.slug.errors}</Text>
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
                        <>
                            <Group>
                                <Text fw={500}>Name:</Text>
                                <Text>{organization.name}</Text>
                            </Group>
                            <Group>
                                <Text fw={500}>Slug:</Text>
                                <Text c="dimmed">{organization.slug}</Text>
                            </Group>
                        </>
                    )}
                </Stack>
            </Card>

            <Card withBorder radius="md">
                <Stack>
                    <Group justify="space-between">
                        <Text fw={700} size="sm" c="dimmed">Organization Members ({members.length})</Text>
                        {isOwner && (
                            <Button
                                variant="light"
                                size="xs"
                                leftSection={<UserPlus size={16} />}
                                disabled
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
                                <Table.Tr key={member.id}>
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
                                        <Badge color={member.role === 'owner' ? 'blue' : 'gray'} variant="light">
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

export default OrganizationDetailsRoute;
