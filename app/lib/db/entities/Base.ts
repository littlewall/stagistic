import {
    PrimaryKey,
    Property,
} from '@mikro-orm/core';
import {nanoid} from 'nanoid';

export abstract class Base {
    @PrimaryKey()
    id: string = nanoid();

    @Property({default: 'now()'})
    createdAt: Date = new Date();

    @Property({onUpdate: () => new Date()})
    updatedAt: Date = new Date();
}
