import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import websocket from '@fastify/websocket'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fg from 'fast-glob'
import { env } from './utils/env'
import { sendResponse } from './utils/response'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function autoRegister(app: ReturnType<typeof fastify>, pattern: string, prefix: string = '') {
  const joined = path.join(__dirname, pattern).replace(/\\/g, '/')
  const files = fg.sync(joined)
  await Promise.all(files.map(async (file) => {
    const module = await import(pathToFileURL(file).href)
    const fn = module.default || module[Object.keys(module)[0]]
    if (typeof fn === 'function') void app.register(fn, { prefix })
  }))
}

export async function buildApp() {
  const isDev = env.NODE_ENV === 'development'
  const app = fastify({
    logger: {
      level: 'info',
      transport: isDev ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  })

  app.register(cors, { origin: true })
  app.register(helmet)
  app.register(websocket)

  await autoRegister(app, 'plugins/**/*.plugin.{ts,js}')
  await autoRegister(app, 'routes/**/*.routes.{ts,js}')
await autoRegister(app, 'routes/**/*.ws.{ts,js}', '/ws')

  app.setNotFoundHandler((_request, reply) => sendResponse(reply, 404, { error: 'Route not found' }))
  app.setErrorHandler((error: any, _request, reply) => {
    const statusCode = error?.statusCode ?? 500
    app.log.error(error)
    return sendResponse(reply, statusCode, { error: statusCode >= 500 ? 'Internal Server Error' : error.message })
  })

  return app
}