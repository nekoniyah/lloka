import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().optional().default('0.0.0.0'),
  PORT: z.string().optional().default('4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET is required'),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('❌ Invalid environment variables:')
  const flattened = z.treeifyError(result.error)
  console.error(flattened.errors)
  process.exit(1)
}
export const env = result.data