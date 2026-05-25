import z from "zod";
import { WebSocketContext } from "./websocket";

export type WebSocketRole = "main" | "controller";
export type GameData = {
  id: string;
  name: string;
  players: string[];
  state: Record<string, any>;
};

export const ongoingGames: Map<string, GameData> = new Map();
