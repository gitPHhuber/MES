const SENSITIVE_KEYS = [
  /token/i,
  /password/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /refresh/i,
  /jwt/i,
];

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.some((pattern) => pattern.test(key));
}

function sanitizeInput(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item));
  }

  if (typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      if (isSensitiveKey(key)) {
        acc[key] = "[REDACTED]";
        return acc;
      }
      acc[key] = sanitizeInput(value[key]);
      return acc;
    }, {});
  }

  return value;
}

function getRequestId(req) {
  if (!req) return undefined;
  return (
    req.headers?.["x-request-id"] ||
    req.headers?.["x-correlation-id"] ||
    req.headers?.["x-requestid"] ||
    req.id
  );
}

function buildRequestLogContext(req, options = {}) {
  const { includeInput = false } = options;
  const context = {
    requestId: getRequestId(req),
    userId: req?.user?.id,
    userLogin: req?.user?.login,
  };

  if (includeInput) {
    context.params = sanitizeInput(req?.params || {});
    context.query = sanitizeInput(req?.query || {});
    context.body = sanitizeInput(req?.body || {});
  }

  return context;
}

function buildServiceLogContext(context = {}, extra = {}) {
  return {
    requestId: context.requestId,
    userId: context.userId,
    userLogin: context.userLogin,
    ...extra,
  };
}

module.exports = {
  buildRequestLogContext,
  buildServiceLogContext,
  sanitizeInput,
};
