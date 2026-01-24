# Database migrations (Sequelize)

This service no longer runs `sequelize.sync({ alter: true })` on startup. Schema changes are applied with migrations in `migrations/`.

## Local development workflow

1. Ensure your `.env` is set with database connection variables:

   ```bash
   DB_HOST=...
   DB_PORT=5432
   DB_NAME=...
   DB_USER=...
   DB_PASSWORD=...
   ```

2. Run migrations:

   ```bash
   npm run db:migrate
   ```

3. (Optional) Seed data:

   ```bash
   npm run db:seed
   ```

4. Rolling back the last migration:

   ```bash
   npm run db:migrate:undo
   ```

## Creating a new migration

```bash
npx sequelize-cli migration:generate --name <describe-change>
```

Then update the generated file in `migrations/` and apply it with `npm run db:migrate`.

## CI / deploy

Make sure deployment scripts run migrations (e.g. `npm run db:migrate`) before starting the server.
