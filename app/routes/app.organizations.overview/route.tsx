
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
import type {
    ActionFunctionArgs,
    LoaderFunctionArgs,
} from '@remix-run/node';
import {data} from '@remix-run/node';
import {
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

import {auth} from '~lib/auth/auth.server';
import {
    createOrganization,
    listOrganizationsForUser,
} from '~lib/auth/organization.server';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {OrganizationFormOutput} from '~schemas/forms/organization';
import {organizationFormSchema} from '~schemas/forms/organization';

import {useToastFromUrl} from './useToastFromUrl';

interface OrganizationData {
    id: string,
    name: string,
    slug: string,
    role: string,
    createdAt: string,
}

interface LoaderData {
    organizations: OrganizationData[],
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
            return data({error: 'Unauthorized'}, {status: 401});
        }

        const formData = await request.formData();

        const submission = parseWithValibot(formData, {schema: organizationFormSchema});

        if (submission.status !== 'success') {
            return data({formError: 'Invalid form submission'});
        }

        // Generate slug from name if not provided
        const submissionValue = submission.value;
        const slug = submissionValue.slug || submissionValue.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        // Create organization with the current user as owner
        const newOrg = await createOrganization({
            name: submissionValue.name,
            slug,
            userId: session.user.id,
        });

        if (!newOrg) {
            return data({error: 'Failed to create organization'}, {status: 500});
        }

        return data({success: true});
    } catch (error: unknown) {
        console.error('Organization creation error:', error);

        // Check for slug already exists error
        if (error instanceof Error && error.message.includes('slug')) {
            return data({
                error: 'An organization with this name already exists. Please choose a different name.',
            }, {status: 400});
        }

        return data({
            error: 'An error occurred while creating the organization.',
        }, {status: 500});
    }
};

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user) {
            return data({error: 'Unauthorized'}, {status: 401});
        }

        // Get all organizations for the user
        const orgs = await listOrganizationsForUser(session.user.id);

        // Map organizations data
        const organizationData: OrganizationData[] = orgs.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: org.role,
            createdAt: org.createdAt.toISOString(),
        }));

        return data({organizations: organizationData});
    } catch (error) {
        console.error('Error loading organizations:', error);

        return new Response('An error occurred while loading the organizations overview.', {status: 500});
    }
};

const OrganizationsRoute = () => {
    const {organizations} = useLoaderData<LoaderData>();
    const actionData = useActionData<ActionData>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    // This will show toast messages from URL parameters
    useToastFromUrl();

    const [opened, {open, close}] = useDisclosure(false);

    const [form, fields] = useForm({
        id: 'organization-form',
        onValidate({formData}) {
            return parseWithValibot(formData, {schema: organizationFormSchema});
        },
        defaultValue: {
            name: '',
            slug: '',
        },
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
            <Modal opened={opened} onClose={close} title="Create New Organization" size="md">
                <Form method="post" id={form.id}>
                    <Stack gap="md">
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
                            label="Slug (optional)"
                            placeholder="my-organization"
                            description="Will be auto-generated from name if not provided"
                            {...getInputProps(fields.slug, {type: 'text'})}
                        />
                        {fields.slug.errors && (
                            <Text c="red" size="sm">{fields.slug.errors}</Text>
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
                                Create Organization
                            </Button>
                        </Group>
                    </Stack>
                </Form>
            </Modal>

            <Group justify="space-between" mb="md">
                <Title order={2}>Organizations Overview</Title>
                <Button
                    leftSection={<UserPlus size={16} />}
                    variant="filled"
                    onClick={handleOpenModal}
                >
                    Create New Organization
                </Button>
            </Group>

            {organizations.length === 0 ? (
                <Card withBorder padding="xl" radius="md">
                    <Stack align="center" gap="md">
                        <Users size={64} opacity={0.5} />
                        <Text size="xl" ta="center" fw={500}>
                            You don't have any organizations yet
                        </Text>
                        <Text size="sm" ta="center" c="dimmed" maw={400}>
                            Organizations allow you to collaborate with other users. Create your first organization to get started.
                        </Text>
                        <Button
                            leftSection={<UserPlus size={16} />}
                            variant="filled"
                            onClick={handleOpenModal}
                        >
                            Create Your First Organization
                        </Button>
                    </Stack>
                </Card>
            ) : (
                <Paper withBorder radius="md">
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Organization Name</Table.Th>
                                <Table.Th>Slug</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th style={{width: '80px'}}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {organizations.map(org => (
                                <Table.Tr key={org.id}>
                                    <Table.Td>
                                        <Text fw={500}>{org.name}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text c="dimmed" size="sm">{org.slug}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={org.role === 'owner' ? 'blue' : 'gray'} variant='light'>
                                            {org.role}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Tooltip label="View Organization Details">
                                            <ActionIcon
                                                component={Link}
                                                to={`/app/organizations/${org.id}`}
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

export default OrganizationsRoute;
