import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifyHelmet from '@fastify/helmet'

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(fastifyHelmet, {
  })
})