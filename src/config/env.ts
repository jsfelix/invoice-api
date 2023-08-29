import 'dotenv/config'
import { z } from 'zod'

import { logError } from './debug'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  APP_PORT: z.coerce.number().default(3333),
  APP_SECRET: z.string(),
  DATABASE_URL: z.string(),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  logError('❌ error on validate environment variables!')
  logError(JSON.stringify(_env.error.format(), null, 2))
  process.exit(1)
}

export const env = _env.data
