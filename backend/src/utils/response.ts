import { FastifyReply } from 'fastify'

export function sendResponse<T>(reply: FastifyReply, statusCode: number, data: T) {
  return reply.status(statusCode).send({ success: statusCode < 400, data })
}