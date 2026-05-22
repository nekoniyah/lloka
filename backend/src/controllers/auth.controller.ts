import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import { createSessionToken } from "../utils/session";

export async function registerUserHandler(
  request: FastifyRequest<{
    Body: { username: string; password: string; remember?: boolean };
  }>,
  reply: FastifyReply,
) {
  const hashedPassword = bcrypt.hashSync(request.body.password, 10);

  const existingUserUsername = await request.server.database.user.findUnique({
    where: {
      username: request.body.username,
    },
  });

  if (existingUserUsername) {
    await reply.status(409).send({
      error: "Username already exists",
    });

    return;
  }

  const user = await request.server.database.user.create({
    data: {
      password: hashedPassword,
      username: request.body.username,
      token: createSessionToken(),
    },
  });

  const { token: nextToken } = await request.session?.create(user.id, {
    remember: request.body.remember,
  })!;

  await reply.status(201).send({
    user: {
      id: user.id,
      username: user.username,
      token: nextToken,
    },
  });
}

export async function loginUserHandler(
  request: FastifyRequest<{
    Body: { username: string; password: string; remember?: boolean };
  }>,
  reply: FastifyReply,
) {
  const user = await request.server.database.user.findUnique({
    where: {
      username: request.body.username,
    },
  });

  if (!user) {
    await reply.status(401).send({
      error: "Invalid username or password",
    });

    return;
  }

  const isPasswordValid = bcrypt.compareSync(
    request.body.password,
    user.password,
  );

  if (!isPasswordValid) {
    await reply.status(401).send({
      error: "Invalid username or password",
    });

    return;
  }

  const { token: nextToken } = await request.session?.create(user.id, {
    remember: request.body.remember,
  })!;

  await reply.status(200).send({
    user: {
      id: user.id,
      username: user.username,
      token: nextToken,
    },
  });
}
