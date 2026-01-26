const { ZodError } = require("zod");

const formatZodErrors = (error) =>
  error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

const validateRequest = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodErrors(error),
      });
    }
    return next(error);
  }
};

module.exports = validateRequest;
