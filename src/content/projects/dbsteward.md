---
title: DBSteward
link: https://github.com/nkiraly/DBSteward
---

DBSteward is a database change management tool, allowing developers to define and version the *current* state of the database, rather than an initial state and deltas like most database migration solutions.

DBSteward can either build a fresh database, or compute the DDL/DML necessary to upgrade a database from one version to another while maintaining as much data integrity as possible. DBSteward is primarily compatible with PostgreSQL and MySQL, with partial support for MS SQL Server.

Code: [On GitHub](https://github.com/nkiraly/DBSteward)  
Package: [On Packagist](https://packagist.org/packages/nkiraly/dbsteward) and [PEAR](http://pear.dbsteward.org/)

## My Role

I originally implemented most of the MySQL driver for DBSteward, and now develop new features, make various improvements, and fix bugs.

## Technology

DBSteward is written in PHP, consumes XML, and outputs MySQL, PostgreSQL, and MSSQL compatible SQL.

## Example

For example, given the following minimal XML definition:

```xml
<dbsteward>
  <database>
    <role>
      <application>someapp</application>
      <owner>deployment</owner>
      <replication></replication>
      <readonly></readonly>
    </role>
  </database>
  <schema name="public" owner="ROLE_OWNER">
    <table name="users" owner="ROLE_OWNER" primaryKey="user_id">
      <column name="user_id" type="serial" />
      <column name="user_name" type="varchar(100)" null="false" unique="true" />
      <grant role="ROLE_APPLICATION" operation="SELECT,INSERT,UPDATE,DELETE" />
    </table>
    <grant role="ROLE_APPLICATION" operation="USAGE" />
  </schema>
</dbsteward>
```

DBSteward will generate the corresponding PostgreSQL-flavored DDL:

```sql
BEGIN;

GRANT USAGE ON SCHEMA public TO someapp;
CREATE TABLE public.users (
  user_id serial,
  user_name varchar(100)
);
ALTER TABLE public.users OWNER TO deployment;

ALTER TABLE public.users_user_id_seq OWNER TO deployment;

CREATE UNIQUE INDEX users_user_name_key ON public.users USING btree (user_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO someapp;
GRANT SELECT,UPDATE ON SEQUENCE public.users_user_id_seq TO someapp;

ALTER TABLE public.users ALTER COLUMN user_name SET NOT NULL;
ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

COMMIT;
```

Then, as you develop, suppose you want to add another column to that table, add some static data, and change an existing column:

```xml
<table name="users" owner="ROLE_OWNER" primaryKey="user_id">
  <!-- ... -->
  <column name="user_name" type="varchar(150)" />
  <column name="user_bio" type="text" />
  <rows columns="user_id, user_name, user_bio">
    <row><col sql="true">DEFAULT</col><col>austin109@gmail.com</col><col>The creator of the app</col></row>
  </rows>
  <!-- ... -->
</table>
```

Then simply checkout the previous version of the file, and tell DBSteward to diff the two. It will output the following upgrade DDL:

```sql
BEGIN;

ALTER TABLE public.users
  ADD COLUMN user_bio text ,
  ALTER COLUMN user_name TYPE varchar(150) /* TYPE change - table: users original: varchar(100) new: varchar(150) */;
INSERT INTO public.users (user_id, user_name, user_bio) VALUES (DEFAULT, E'austin109@gmail.com', E'The creator of the app');

COMMIT;
```