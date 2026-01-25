const { z, paginationSchema } = require("./common");

const auditQuerySchema = paginationSchema
  .extend({
    action: z.string().optional(),
    entity: z.string().optional(),
    userId: z.coerce.number().int().positive().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .passthrough();

module.exports = {
  auditQuerySchema,
};
