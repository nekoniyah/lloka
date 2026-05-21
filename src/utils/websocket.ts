import { WebSocket } from '@fastify/websocket'
import { z } from 'zod'
import { createHmac, randomUUID } from 'crypto'

// ----- Protocol -----

const baseSchema = z.object({
  event: z.string().min(1),
  data: z.unknown().optional()
})
type BaseMessage = z.infer<typeof baseSchema>

// ----- Types -----

export type WebSocketUser = Record<string, any>
type Client = {
  id: string
  socket: WebSocket
  rooms: Set<string>
  handlers: Map<string, (data: unknown, context: WebSocketContext) => void>
  user?: WebSocketUser
  rate?: {
    tokens: number
    last: number
  }
}
const clients = new Map<string, Client>()
const rooms = new Map<string, Set<string>>()

// ----- Options -----

type WebSocketOptions = {
  auth?: boolean | ((request: any) => Promise<WebSocketUser | null> | WebSocketUser | null)
  jwtSecret?: string
  rateLimit?: {
    max: number
    windowMs: number
  }
}

// ----- JsonWebSocket -----

function verifyJWT(token: string, secret: string): WebSocketUser | null {
  try {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) return null
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
    if (expected !== signature) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return decoded
  } catch {
    return null
  }
}

// ----- Core -----

export async function registerConnection(socket: WebSocket, request?: any, options?: WebSocketOptions): Promise<Client> {
  const id = randomUUID()
  const client: Client = { id, socket, rooms: new Set(), handlers: new Map() }
  if (options?.auth) {
    let user: WebSocketUser | null = null
    if (typeof options.auth === 'function') {
      user = await options.auth(request)
    } else if (options.auth === true) {
      const header = request?.headers?.authorization
      const token = header?.replace('Bearer ', '')
      if (token && options.jwtSecret) user = verifyJWT(token, options.jwtSecret)
    }
    if (!user) {
      socket.send(JSON.stringify({ event: 'error', data: { message: 'Unauthorized' } }))
      socket.close()
      throw new Error('Unauthorized WS connection')
    }
    client.user = user
  }
  if (options?.rateLimit) {
    client.rate = {
      tokens: options.rateLimit.max,
      last: Date.now()
    }
  }
  clients.set(id, client)
  socket.on('close', () => {
    for (const room of client.rooms) leaveRoom(id, room)
    clients.delete(id)
  })
  return client
}

// ----- Rooms -----

function joinRoom(clientId: string, room: string) {
  const client = clients.get(clientId)
  if (!client) return
  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room)!.add(clientId)
  client.rooms.add(room)
}

function leaveRoom(clientId: string, room: string) {
  const client = clients.get(clientId)
  if (!client) return
  rooms.get(room)?.delete(clientId)
  client.rooms.delete(room)
  if (rooms.get(room)?.size === 0) rooms.delete(room)
}

// ----- Broadcasting -----

function sendRaw(socket: WebSocket, payload: unknown) {
  socket.send(JSON.stringify(payload))
}

function broadcast(message: BaseMessage, room?: string) {
  const payload = JSON.stringify(message)
  if (room) {
    const ids = rooms.get(room)
    if (!ids) return
    for (const id of ids) clients.get(id)?.socket.send(payload)
    return
  }
  for (const client of clients.values()) client.socket.send(payload)
}

// ----- Rate Limiting -----

function checkRate(client: Client, options?: WebSocketOptions): boolean {
  if (!options?.rateLimit || !client.rate) return true
  const now = Date.now()
  const elapsed = now - client.rate.last
  const refill = (elapsed / options.rateLimit.windowMs) * options.rateLimit.max
  client.rate.tokens = Math.min(options.rateLimit.max, client.rate.tokens + refill)
  client.rate.last = now
  if (client.rate.tokens < 1) return false
  client.rate.tokens -= 1
  return true
}

// ----- Context -----

export type WebSocketContext = {
  id: string
  user?: WebSocketUser
  send: (event: string, data?: unknown) => void
  join: (room: string) => void
  leave: (room: string) => void
  broadcast: (event: string, data?: unknown, room?: string) => void
  on: <T>(event: string, schema: z.ZodType<T>, handler: (data: T, context: WebSocketContext) => void) => void
}

export function createWebSocketContext(client: Client, options?: WebSocketOptions): WebSocketContext {
  const context: WebSocketContext = {
    id: client.id,
    user: client.user,
    send: (event, data) => sendRaw(client.socket, { event, data }),
    join: (room) => joinRoom(client.id, room),
    leave: (room) => leaveRoom(client.id, room),
    broadcast: (event, data, room) => broadcast({ event, data }, room),
    on: (event, schema, handler) => {
      client.handlers.set(event, (raw, context) => {
        if (!checkRate(client, options)) return context.send('error', { message: 'Rate limit exceeded' })
        const parsed = schema.safeParse(raw)
        if (!parsed.success) return context.send('error', { message: `Invalid payload for ${event}` })
        handler(parsed.data, context)
      })
    }
  }
  client.socket.on('message', (raw: any) => {
    let message: BaseMessage
    try { message = baseSchema.parse(JSON.parse(raw.toString())) } catch { return context.send('error', { message: 'Invalid message format' }) }
    const handler = client.handlers.get(message.event)
    if (!handler) return context.send('error', { message: `Unhandled event: ${message.event}` })
    handler(message.data, context)
  })
  return context
}