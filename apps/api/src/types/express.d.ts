import "express";

declare module "express-serve-static-core" {
  type AuthScope = "tenant" | "platform";
  type AuthActorType = "tenant" | "platform";

  interface Request {
    user?: {
      id: string;
      roles: string[];
      tenantId: string;
      scope: AuthScope;
      actorType: AuthActorType;
      impersonationSessionId?: string;
    };
  }
}
