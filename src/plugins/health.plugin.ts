import { FastifyInstance } from 'fastify'
import { sendResponse } from '../utils/response'

export default async function healthPlugin(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => sendResponse(reply, 200, { status: 'ok', uptime: process.uptime() }))
}