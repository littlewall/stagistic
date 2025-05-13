import {Migration} from '@mikro-orm/migrations';

export class Migration20250508135932 extends Migration {
    override up(): void {
        this.addSql('create table "user" ("id" varchar(255) not null, "created_at" timestamptz not null default \'now()\', "updated_at" timestamptz not null, "email" varchar(255) not null, "name" varchar(255) null, "is_verified" boolean not null default false, constraint "user_pkey" primary key ("id"));');
        this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');
    }

    override down(): void {
        this.addSql('drop table if exists "user" cascade;');
    }
}
