import { Migration } from '@mikro-orm/migrations';

export class Migration20250521123443 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);
    this.addSql(`alter table "user" alter column "created_at" set default 'now()';`);
    this.addSql(`alter table "user" alter column "is_verified" type boolean using ("is_verified"::boolean);`);
    this.addSql(`alter table "user" alter column "is_verified" set default true;`);

    this.addSql(`alter table "team" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`);
    this.addSql(`alter table "team" alter column "created_at" set default 'now()';`);

    this.addSql(`alter table "role" drop constraint "role_name_unique";`);

    this.addSql(`alter table "role" add constraint "role_team_id_name_unique" unique ("team_id", "name");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "role" drop constraint "role_team_id_name_unique";`);

    this.addSql(`alter table "role" add constraint "role_name_unique" unique ("name");`);

    this.addSql(`alter table "team" alter column "created_at" type timestamptz(6) using ("created_at"::timestamptz(6));`);
    this.addSql(`alter table "team" alter column "created_at" set default '2025-05-21 10:15:14.633159+00';`);

    this.addSql(`alter table "user" alter column "created_at" type timestamptz(6) using ("created_at"::timestamptz(6));`);
    this.addSql(`alter table "user" alter column "created_at" set default '2025-05-21 10:15:14.586179+00';`);
    this.addSql(`alter table "user" alter column "is_verified" type bool using ("is_verified"::bool);`);
    this.addSql(`alter table "user" alter column "is_verified" set default false;`);
  }

}
