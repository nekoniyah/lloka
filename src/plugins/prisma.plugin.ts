import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../prisma/client'
import { env } from 'prisma/config'

declare module 'fastify' {
  interface FastifyInstance {
    database: PrismaClient
  }
}

function hidePassword(): string {
  const url = env('DATABASE_URL')
  return url.replace(/\/\/(.*):(.*)@/, '//$1:****@')
}

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  const adapter = new PrismaLibSql({ url: env('DATABASE_URL') })
  const database = new PrismaClient({ adapter })
  await database.$connect()
  fastify.log.info(`Database connected to ${hidePassword()}`)
  fastify.decorate('database', database)
  fastify.addHook('onClose', async (fastify) => await fastify.database.$disconnect())
})