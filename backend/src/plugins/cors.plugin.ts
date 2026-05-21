import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(fastifyCors, {
    origin: true
  })
})