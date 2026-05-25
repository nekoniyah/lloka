import z from "zod";
import { WebSocketContext } from "./websocket";

export type WebSocketRole = "main" | "controller";

export default class WebSocketRoleManager<HasRole extends boolean = false> {
  public metadata: Map<string, any> = new Map();

  public role: HasRole extends true ? WebSocketRole : null =
    null as HasRole extends true ? WebSocketRole : null;

  constructor(private readonly _context: WebSocketContext) {
    this._context = _context;

    this.context.on(
      "join-as",
      z.object({ role: z.custom<WebSocketRole>() }),
      ({ role }) => {
        this.setRole(role as WebSocketRole);
        this.context.send("joined-as", {
          role: this.role,
        });
      },
    );
  }

  hasRole(): this is WebSocketRoleManager<true> {
    return !!this.role;
  }

  setRole(role: WebSocketRole): asserts this is WebSocketRoleManager<true> {
    (this.role as WebSocketRole) = role;
  }

  protected get context() {
    return this._context;
  }
}
