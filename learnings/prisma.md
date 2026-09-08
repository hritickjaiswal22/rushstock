# For setup

1. npx prisma init
2. Add schema along with .env and db url
3. npx prisma migrate dev --name init

That's it

# For migrations (later changes like constarits etc)

1. npx prisma migrate dev --create-only --name add_constraints (this creates a empty migration)
2. Add migration details
3. npx prisma migrate dev - applies the migration
4. npx prisma generate - generate the client
