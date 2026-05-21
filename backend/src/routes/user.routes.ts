import { FastifyInstance } from 'fastify'
import { getUserHandler } from '../controllers/user.controller'

export default async function userRoutes(app: FastifyInstance) {
  app.get('/users/:id', getUserHandler)
}