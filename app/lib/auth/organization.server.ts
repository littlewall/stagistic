import {Pool} from 'pg';

import globals from '../../config/globals';

const {
    user,
    password,
    host,
    database,
} = globals.get('database.postgres');

const pool = new Pool({
    connectionString: `postgres://${user}:${password}@${host}/${database}`,
});

export interface Organization {
    id: string,
    name: string,
    slug: string,
    logo: string | null,
    createdAt: Date,
    metadata: string | null,
}

export interface Member {
    id: string,
    organizationId: string,
    userId: string,
    role: string,
    createdAt: Date,
}

export interface OrganizationWithRole extends Organization {
    role: string,
}

/**
 * Create a new organization
 */
export async function createOrganization(data: {
    name: string,
    slug: string,
    userId: string,
    logo?: string | null,
    metadata?: any,
}): Promise<Organization> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create organization
        const orgResult = await client.query(
            `INSERT INTO organization (id, name, slug, logo, "createdAt", metadata)
             VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4)
             RETURNING *`,
            [
                data.name,
                data.slug,
                data.logo || null,
                data.metadata ? JSON.stringify(data.metadata) : null,
            ],
        );

        const organization = orgResult.rows[0];

        // Add creator as owner
        await client.query(
            `INSERT INTO member (id, "organizationId", "userId", role, "createdAt")
             VALUES (gen_random_uuid(), $1, $2, 'owner', NOW())`,
            [organization.id, data.userId],
        );

        await client.query('COMMIT');

        return organization;
    } catch (error) {
        await client.query('ROLLBACK');

        throw error;
    } finally {
        client.release();
    }
}

/**
 * List all organizations for a user
 */
export async function listOrganizationsForUser(userId: string): Promise<OrganizationWithRole[]> {
    const result = await pool.query(
        `SELECT 
            o.*,
            m.role
         FROM organization o
         INNER JOIN member m ON o.id = m."organizationId"
         WHERE m."userId" = $1
         ORDER BY o."createdAt" DESC`,
        [userId],
    );

    return result.rows;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
    const result = await pool.query(
        'SELECT * FROM organization WHERE id = $1',
        [organizationId],
    );

    return result.rows[0] || null;
}

/**
 * Get organization member
 */
export async function getOrganizationMember(organizationId: string, userId: string): Promise<Member | null> {
    const result = await pool.query(
        'SELECT * FROM member WHERE "organizationId" = $1 AND "userId" = $2',
        [organizationId, userId],
    );

    return result.rows[0] || null;
}

/**
 * List all members of an organization
 */
export async function listOrganizationMembers(organizationId: string): Promise<Member[]> {
    const result = await pool.query(
        'SELECT * FROM member WHERE "organizationId" = $1 ORDER BY "createdAt" DESC',
        [organizationId],
    );

    return result.rows;
}

/**
 * Update organization
 */
export async function updateOrganization(
    organizationId: string,
    data: Partial<Pick<Organization, 'name' | 'slug' | 'logo' | 'metadata'>>,
): Promise<Organization> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }

    if (data.slug !== undefined) {
        updates.push(`slug = $${paramIndex++}`);
        values.push(data.slug);
    }

    if (data.logo !== undefined) {
        updates.push(`logo = $${paramIndex++}`);
        values.push(data.logo);
    }

    if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(organizationId);

    const result = await pool.query(
        `UPDATE organization SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values,
    );

    return result.rows[0];
}

/**
 * Delete organization
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
    await pool.query('DELETE FROM organization WHERE id = $1', [organizationId]);
}
