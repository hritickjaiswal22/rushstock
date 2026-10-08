import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Changes reverted since changing poll size to correct limit will depend upon DB's state so keeping default for the time being
// import { Pool } from "pg";

// // Explicit connection pool — default is ~9, we need more under load.
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL!,
//   max: 50, // allow 50 concurrent transactions
//   idleTimeoutMillis: 30_000,
//   connectionTimeoutMillis: 5_000,
// });

const adapter = new PrismaPg(process.env.DATABASE_URL!);

export const prisma = new PrismaClient({
  adapter,
});
