import { FastifyInstance } from 'fastify'
import { sendResponse } from '../utils/response'

export default async function healthPlugin(fastify: FastifyInstance) {
  const checkDatabase = async () => {
    try {
      await fastify.database.$queryRaw`SELECT 1`
      return 'ok'
    } catch (error) {
      return 'error'
    }
  }

  fastify.get('/health', async (_request, reply) => sendResponse(reply, 200, { status: 'ok', database: await checkDatabase(), uptime: process.uptime() }))
}