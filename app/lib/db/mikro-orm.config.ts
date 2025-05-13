import {PostgreSqlDriver} from '@mikro-orm/postgresql';
import {TsMorphMetadataProvider} from '@mikro-orm/reflection';
import {SqlHighlighter} from '@mikro-orm/sql-highlighter';
import {
    LoadStrategy,
    Options,
    PopulateHint,
} from '@mikro-orm/core';
import globals from '../../config/globals';
import entities from './entities';

const {
    host,
    user,
    password,
    database,
} = globals.get('database.postgres');

const config: Options<PostgreSqlDriver> = {
    migrations: {
        path: './migrations',
        tableName: 'migrations',
        transactional: false,
    },
    seeder: {
        path: './seeders',
        emit: 'ts',
    },
    tsNode: process.env.NODE_DEV === 'true',
    driver: PostgreSqlDriver,
    driverOptions: {
        connection: {ssl: true},
    },
    entities,
    clientUrl: `postgresql://${user}:${password}@${host}/${database}?sslmode=require`,
    loadStrategy: LoadStrategy.JOINED,
    highlighter: new SqlHighlighter(),
    metadataProvider: TsMorphMetadataProvider,
    populateWhere: PopulateHint.INFER,
    allowGlobalContext: true,
    debug: true,
    pool: {
        min: 0,
        max: 10,
        acquireTimeoutMillis: 8000,
        idleTimeoutMillis: 8000,
        reapIntervalMillis: 1000,
    },
};

export default config;
