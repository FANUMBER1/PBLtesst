export function formatErrorResponse(err: unknown, defaultMessage = "Internal Server Error") {
  const message = err instanceof Error ? err.message : defaultMessage;
  return {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
}
