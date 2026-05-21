import FastifyPlugin from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { env } from '../utils/env'

export default FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  })
})