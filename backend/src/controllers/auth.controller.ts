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

  await request.server.database.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: nextToken,
    },
  });

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

  await request.server.database.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: nextToken,
    },
  });

  await reply.status(200).send({
    user: {
      id: user.id,
      username: user.username,
      token: nextToken,
    },
  });
}

async function requirePassword(
  request: FastifyRequest,
  reply: FastifyReply,
  password?: string,
): Promise<boolean> {
  if (!password) {
    await reply.status(400).send({
      error: "Current password is required to change password",
    });
    return false;
  }

  const user = await request.session?.require()!;
  const fullUser = (await request.server.database.user.findUnique({
    where: {
      id: user.id,
    },
  }))!;

  const isPasswordValid = bcrypt.compareSync(password, fullUser.password);

  if (!isPasswordValid) {
    await reply.status(401).send({
      error: "Invalid current password",
    });

    return false;
  }

  return true;
}

export async function updateUserHandler(
  request: FastifyRequest<{
    Body: {
      username?: string;
      password?: string;
      currentPassword?: string;
      email?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const user = await request.session?.require()!;
  let newToken: string | null = null;

  if (request.body.password) {
    const isPasswordValid = await requirePassword(
      request,
      reply,
      request.body.currentPassword,
    );

    if (!isPasswordValid) return;

    // Updates password and creates a new token;

    const { token } = (await request.session?.rotate())!;

    const hashedPassword = bcrypt.hashSync(request.body.password, 10);

    await request.server.database.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        token,
      },
    });

    newToken = token;
  }

  if (request.body.username) {
    await request.server.database.user.update({
      where: {
        id: user.id,
      },
      data: {
        username: request.body.username,
      },
    });
  }

  if (request.body.email) {
    const isPasswordValid = await requirePassword(
      request,
      reply,
      request.body.currentPassword,
    );

    if (!isPasswordValid) return;

    await request.server.database.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: request.body.email,
      },
    });
  }

  await reply.send({ message: "ok", token: newToken });
}
