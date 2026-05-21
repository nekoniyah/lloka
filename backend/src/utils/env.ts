import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().optional().default('4000'),
  HOST: z.string().optional().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('❌ Invalid environment variables:')
  const flattened = z.treeifyError(result.error)
  console.error(flattened.errors)
  process.exit(1)
}
export const env = result.data