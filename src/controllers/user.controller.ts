import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { sendResponse } from '../utils/response'

const userSchema = z.object({ id: z.uuid() })

export async function getUserHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const parseResult = userSchema.safeParse(request.params)
  if (!parseResult.success) return sendResponse(reply, 400, { error: 'Invalid user ID' })
  const user = { id: parseResult.data.id, name: 'Nolly Example' }
  return sendResponse(reply, 200, user)
}