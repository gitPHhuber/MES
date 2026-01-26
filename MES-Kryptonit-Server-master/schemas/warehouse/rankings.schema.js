const { z } = require("../common");

const rankingsQuerySchema = z
  .object({
    period: z.enum(["day", "week", "month", "all"]).optional(),
  })
  .passthrough();

module.exports = {
  rankingsQuerySchema,
};
