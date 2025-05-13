import {
    Property,
    Entity,
} from '@mikro-orm/core';
import {Base} from './Base';

@Entity()
export class User extends Base {
    @Property({unique: true})
    email!: string;

    @Property({nullable: true})
    name?: string;

    @Property({default: false})
    isVerified: boolean = false;
}
