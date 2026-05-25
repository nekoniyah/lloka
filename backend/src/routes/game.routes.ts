import { FastifyInstance } from "fastify";
import {
  deleteEditorGameElementHandler,
  deleteEditorGameHandler,
  getEditorGameElementsHandler,
  getEditorGameHandler,
  getEditorGamesHandler,
  getGameHandler,
  getGamesHandler,
  postEditorGameElementHandler,
  postEditorGameHandler,
  putEditorGameElementHandler,
  putEditorGameHandler,
} from "../controllers/game.controller";

export default async function gameRoutes(app: FastifyInstance) {
  app.get("/games", getGamesHandler);
  app.get("/games/:id", getGameHandler);

  app.get("/editor/games", getEditorGamesHandler);
  app.get("/editor/games/:id", getEditorGameHandler);

  app.post("/editor/games", postEditorGameHandler);
  app.put("/editor/games/:id", putEditorGameHandler);
  app.delete("/editor/games/:id", deleteEditorGameHandler);

  app.get("/editor/games/:id/elements", getEditorGameElementsHandler);
  app.post("/editor/games/:id/elements", postEditorGameElementHandler);
  app.delete(
    "/editor/games/:id/elements/:elementId",
    deleteEditorGameElementHandler,
  );
  app.put("/editor/games/:id/elements/:elementId", putEditorGameElementHandler);
}
