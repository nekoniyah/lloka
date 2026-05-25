import { FastifyInstance } from "fastify";
import {
  loginUserHandler,
  registerUserHandler,
  updateUserHandler,
} from "../controllers/auth.controller";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", registerUserHandler);
  app.post("/auth/login", loginUserHandler);
  app.post("/auth/profile", async (request, reply) => {
    const user = await request.session?.require()!;

    await reply.send({
      id: user.id,
      token: user.token,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
    });
  });

  app.post("/auth/logout", async (request, reply) => {
    await request.session?.require()!;

    await request.session?.destroy();
    await reply.send({ message: "ok" });
  });

  app.put("/auth/profile", updateUserHandler);
}
