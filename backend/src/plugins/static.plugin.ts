import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/',
  })
})