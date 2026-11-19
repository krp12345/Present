// Domain errors and how each one is reported over HTTP. The messages and
// status codes match what the client already expects (web/src/api/client.ts).

export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errors = {
  denied: () => new AppError(401, "denied"),
  blocked: () => new AppError(403, "blocked"),
  notFound: () => new AppError(404, "not found"),
  staleVersion: () => new AppError(409, "record changed elsewhere"),
  tagNameExists: () => new AppError(409, "tag name already exists"),
  sessionExpired: () => new AppError(401, "session expired"),
  validation: () => new AppError(400, "validation"),
  invalidBody: () => new AppError(400, "invalid body"),
  atLeastOneTag: () => new AppError(400, "at least one tag required"),
  futureTime: () => new AppError(400, "future time not allowed"),
  descriptionTooLong: () => new AppError(400, "description too long"),
  tagNameRequired: () => new AppError(400, "tag name required"),
  tagNameTooLong: () => new AppError(400, "tag name too long"),
  invalidTime: () => new AppError(400, "invalid time"),
  methodNotAllowed: () => new AppError(405, "method not allowed"),
};
