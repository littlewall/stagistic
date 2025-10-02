import {betterAuth} from 'better-auth';
import * as dotenv from 'dotenv';
import {Pool} from 'pg';

import {createAuthConfig} from './app/lib/auth/config';

// Load environment variables
dotenv.config();

// Get database config from environment variables
const dbUser = process.env.POSTGRES_USER || 'stagistic';
const dbPassword = process.env.POSTGRES_PASSWORD || 'stagistic_password';
const dbHost = process.env.POSTGRES_HOST || 'localhost';
const dbName = process.env.POSTGRES_DB || 'stagistic';

/**
 * Better Auth configuration for CLI
 * Uses shared config from app/lib/auth/config.ts
 * This ensures configuration is defined in one place only
 */
export const auth = betterAuth(
    createAuthConfig({
        database: new Pool({
            connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}/${dbName}`,
        }),
        // CLI uses default implementations (console.log) from shared config
    }),
);
