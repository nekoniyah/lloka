import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createWebSocketContext, registerConnection } from "../utils/websocket";

export default async function game(app: FastifyInstance) {
  app.get("/game", { websocket: true }, async (socket, request) => {
    const options = {
      auth: false,
      jwtSecret: "dev-secret",
      rateLimit: { max: 10, windowMs: 1000 },
    };
    const client = await registerConnection(socket, request, options);
    const context = createWebSocketContext(client, options);
    app.log.info(
      `WS connected: ${context.id} user=${JSON.stringify(context.user)}`,
    );

    context.on(
      "create",
      z.object({ gameId: z.string().min(1) }),
      async ({ gameId }, context) => {
        const gameData = await app.database.game.findUnique({
          where: { id: gameId },
        });

        if (!gameData) {
          context.send("error", { message: "Game not found" });
          return;
        }

        const ongoingGame = await app.database.ongoingGame.create({
          data: {
            gameId: gameData.id,
          },
        });

        context.send("created", {
          gameId: ongoingGame.gameId,
        });
      },
    );

    context.on(
      "join",
      z.object({ room: z.string().min(1) }),
      ({ room }, context) => {
        context.join(room);
        context.send("joined", { room });
      },
    );
    context.on(
      "leave",
      z.object({ room: z.string().min(1) }),
      ({ room }, context) => {
        context.leave(room);
        context.send("left", { room });
      },
    );
    context.on(
      "message",
      z.object({ room: z.string().min(1), message: z.string().min(1) }),
      ({ room, message }, context) =>
        context.broadcast(
          "message",
          { from: context.user ?? context.id, message },
          room,
        ),
    );
    context.on(
      "broadcast",
      z.object({ message: z.string().min(1) }),
      ({ message }, context) =>
        context.broadcast("broadcast", {
          from: context.user ?? context.id,
          message,
        }),
    );
    socket.on("close", () =>
      app.log.info(`WebSocket disconnected: ${context.id}`),
    );
  });
}
