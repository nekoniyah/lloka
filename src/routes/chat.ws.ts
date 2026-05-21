import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createWebSocketContext, registerConnection } from '../utils/websocket'

export default async function chat(app: FastifyInstance) {
  app.get('/chat', { websocket: true }, async (socket, request) => {
    const options = { auth: false, jwtSecret: 'dev-secret', rateLimit: { max: 10, windowMs: 1000 } }
    const client = await registerConnection(socket, request, options)
    const context = createWebSocketContext(client, options)
    app.log.info(`WS connected: ${context.id} user=${JSON.stringify(context.user)}`)
    context.on('join', z.object({ room: z.string().min(1) }), ({ room }, context) => {
      context.join(room)
      context.send('joined', { room })
    })
    context.on('leave', z.object({ room: z.string().min(1) }), ({ room }, context) => {
      context.leave(room)
      context.send('left', { room })
    })
    context.on('message', z.object({ room: z.string().min(1), message: z.string().min(1) }), ({ room, message }, context) => context.broadcast('message', { from: context.user ?? context.id, message }, room))
    context.on('broadcast', z.object({ message: z.string().min(1) }), ({ message }, context) => context.broadcast('broadcast', { from: context.user ?? context.id, message }))
    socket.on('close', () => app.log.info(`WebSocket disconnected: ${context.id}`))
  })
}