// Shared engine error. The eval harness detects `code === "NOT_IMPLEMENTED"` to
// distinguish "stage not built yet" (scaffold PENDING) from a real failure.
export class NotImplementedError extends Error {
  readonly code = "NOT_IMPLEMENTED";
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
