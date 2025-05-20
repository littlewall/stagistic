import {EntityManager, MikroORM} from '@mikro-orm/core';
import {PostgreSqlDriver} from '@mikro-orm/postgresql';

import config from './mikro-orm.config';

let orm: MikroORM<PostgreSqlDriver> | undefined;

const getOrm = async (): Promise<MikroORM<PostgreSqlDriver>> => {
    if (orm === undefined) {
        orm = await MikroORM.init<PostgreSqlDriver>(config);
    }

    return orm;
};

export const resolveEntityManager = async (em?: EntityManager): Promise<EntityManager> => {
    if (em !== undefined) {
        return em;
    }

    return (await getOrm()).em;
};

export default getOrm;
