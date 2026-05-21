import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { clearSessionCookie, createSessionToken, extractBearerToken, SESSION_TTL_MS, SessionUser, setSessionCookie } from '../utils/session'
import { sendResponse } from '../utils/response'

type SessionAuth = {
  token: string | null
  user: SessionUser | null
  sessionId: string | null
  get: () => Promise<SessionUser | null>
  require: () => Promise<SessionUser | FastifyReply>
  create: (userId: string, input?: { remember?: boolean }) => Promise<{ token: string }>
  destroy: () => Promise<void>
  rotate: () => Promise<{ token: string } | null>
}

declare module 'fastify' {
  interface FastifyRequest {
    session: SessionAuth | null
  }
  interface FastifyInstance {
    requireAuth: (request: any, reply: any) => Promise<unknown>
  }
}

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('session', null)

  fastify.addHook('onRequest', async (request, reply) => {
    const token = extractBearerToken(request)
    request.session = {
      token,
      user: null,
      sessionId: null,

      get: async () => {
        if (!request.session!.token) return null
        const session = await fastify.database.session.findUnique({
          where: { token: request.session!.token },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                token: true,
                email: true,
              },
            },
          },
        })
        if (!session) {
          clearSessionCookie(reply)
          request.session!.token = null
          return null
        }
        if (session.expiresAt.getTime() <= Date.now()) {
          await fastify.database.session.delete({
            where: { id: session.id },
          }).catch(() => null)
          clearSessionCookie(reply)
          request.session!.token = null
          return null
        }
        await fastify.database.session.update({
          where: { id: session.id },
          data: {
            lastUsedAt: new Date(),
          },
        })
        request.session!.user = session.user
        request.session!.sessionId = session.id
        return session.user
      },

      require: async () => {
        const user = await request.session!.get()
        if (!user) {
          clearSessionCookie(reply)
          return sendResponse(reply, 401, { error: 'Unauthorized' })
        }
        return user
      },

      create: async (userId, _input) => {
        const nextToken = createSessionToken()
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
        await fastify.database.session.create({
          data: {
            userId,
            token: nextToken,
            userAgent: request.headers['user-agent'] ?? null,
            ipAddress: request.ip,
            expiresAt,
          },
        })
        setSessionCookie(reply, nextToken)
        request.session!.token = nextToken
        request.session!.user = null
        request.session!.sessionId = null
        return { token: nextToken }
      },

      destroy: async () => {
        if (request.session!.token) {
          await fastify.database.session.deleteMany({
            where: {
              token: request.session!.token,
            },
          })
        }
        request.session!.token = null
        request.session!.user = null
        request.session!.sessionId = null
        clearSessionCookie(reply)
      },

      rotate: async () => {
        if (!request.session!.token) return null
        const currentSession = await fastify.database.session.findUnique({
          where: { token: request.session!.token },
        })
        if (!currentSession) {
          clearSessionCookie(reply)
          request.session!.token = null
          request.session!.user = null
          request.session!.sessionId = null
          return null
        }
        const nextToken = createSessionToken()
        await fastify.database.session.update({
          where: { id: currentSession.id },
          data: {
            token: nextToken,
            lastUsedAt: new Date(),
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          },
        })
        setSessionCookie(reply, nextToken)
        request.session!.token = nextToken
        request.session!.sessionId = currentSession.id
        return { token: nextToken }
      },
    }
  })
  fastify.decorate('requireAuth', async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.session) return sendResponse(_reply, 401, { error: 'Unauthorized' })
    const result = await request.session.require()
    if (!result || 'statusCode' in result) return result
    return result
  })
})