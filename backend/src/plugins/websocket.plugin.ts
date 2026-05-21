import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifyWebsocket from '@fastify/websocket'

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(fastifyWebsocket, {
  })
})