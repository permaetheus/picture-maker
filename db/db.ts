/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import { profilesTable, todosTable } from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  todos: todosTable
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false } // ensures SSL
})

export const db = drizzle(pool, { schema })
