import { FastifyReply, FastifyRequest } from "fastify";

export async function getGameHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const game = await request.server.database.game.findUnique({
    where: { id: request.params.id },
  });

  if (!game) {
    await reply.status(404).send({ error: "Game not found" });
    return;
  }

  const createdAt = game.createdAt.getTime();
  const updatedAt = game.updatedAt.getTime();

  const gameWithTimestamps = {
    ...game,
    createdAt,
    updatedAt,
  };

  await reply.send(gameWithTimestamps);
}

export async function getGamesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const games = await request.server.database.game.findMany();

  const gamesWithTimestamps = games.map((game) => ({
    ...game,
    createdAt: game.createdAt.getTime(),
    updatedAt: game.updatedAt.getTime(),
  }));

  await reply.send(gamesWithTimestamps);
}

export async function getEditorGameHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;

  const game = await request.server.database.game.findUnique({
    where: {
      ownerId: user.id,
      id: request.params.id,
    },
  });

  if (!game) return reply.status(404).send({ error: "Game not found" });

  await reply.send({
    ...game,
    createdAt: game.createdAt.getTime(),
    updatedAt: game.updatedAt.getTime(),
  });
}

export async function getEditorGamesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;

  const games = await request.server.database.game.findMany({
    where: { ownerId: user.id },
  });

  const gamesWithTimestamps = games.map((game) => ({
    ...game,
    createdAt: game.createdAt.getTime(),
    updatedAt: game.updatedAt.getTime(),
  }));

  await reply.send(gamesWithTimestamps);
}

export async function postEditorGameHandler(
  request: FastifyRequest<{
    Body: {
      name: string;
      image?: string;
      editorContent?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;

  const game = await request.server.database.game.create({
    data: {
      name: request.body.name,
      image: request.body.image,
      editorContent: request.body.editorContent,
      ownerId: user.id,
    },
  });

  await reply.send({
    message: "ok",
    id: game.id,
  });
}

export async function putEditorGameHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      image?: string;
      editorContent?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;

  const game = await request.server.database.game.findUnique({
    where: {
      ownerId: user.id,
      id: request.params.id,
    },
  });

  if (!game) return reply.status(404).send({ error: "Game not found" });

  await request.server.database.game.update({
    where: {
      ownerId: user.id,
      id: request.params.id,
    },
    data: {
      name: request.body.name,
      image: request.body.image,
      editorContent: request.body.editorContent,
    },
  });

  await reply.send({ message: "ok" });
}

export async function getEditorGameElementsHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;
  const game = await request.server.database.game.findUnique({
    where: {
      ownerId: user.id,
      id: request.params.id,
    },
    include: { gameElements: true },
  });

  if (!game) return reply.status(404).send({ error: "Game not found" });

  await reply.send(
    game.gameElements.map((element) => ({
      ...element,
      createdAt: element.createdAt.toISOString(),
      updatedAt: element.updatedAt.toISOString(),
    })),
  );
}
