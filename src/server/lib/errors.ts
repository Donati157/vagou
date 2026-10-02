/**
 * Domain errors carry a user-facing PT-BR message. Anything else is treated as internal:
 * logged in full, shown to the user only as a generic message.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Entre na sua conta para continuar.") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para acessar este recurso.") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Não encontramos o que você procurava.") {
    super("NOT_FOUND", message, 404);
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[] | undefined> };
