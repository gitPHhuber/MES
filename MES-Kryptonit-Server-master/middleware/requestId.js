const { randomUUID } = require("crypto");
const { requestContext } = require("../services/requestContext");

module.exports = function requestId(req, res, next) {
  const headerRequestId = req.get("x-request-id");
  const requestId = headerRequestId || randomUUID();

  req.requestId = requestId;
  res.set("X-Request-Id", requestId);

  requestContext.run({ requestId }, () => next());
};
