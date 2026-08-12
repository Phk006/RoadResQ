type LogContext = Record<string, unknown> & { requestId?: string };

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  console[level](JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...context }));
}

export const logger = { info: (event: string, context?: LogContext) => write("info", event, context), warn: (event: string, context?: LogContext) => write("warn", event, context), error: (event: string, context?: LogContext) => write("error", event, context) };
