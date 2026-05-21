import 'dotenv/config'
import { buildApp } from './app'
import { env } from './utils/env'

const PORT = parseInt(env.PORT, 10)
const HOST = env.HOST

buildApp()
  .then((app) => {
    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down...`)
      await app.close()
      process.exit(0)
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    app.listen({ port: PORT, host: HOST }).catch((error) => {
      app.log.error('Error starting server:', error)
      process.exit(1)
    })
  })
  .catch((error) => {
    console.error('Error building app:', error)
    process.exit(1)
  })