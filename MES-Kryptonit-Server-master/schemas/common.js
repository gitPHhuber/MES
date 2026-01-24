const { z } = require("zod");

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const idsBodySchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).nonempty(),
});

module.exports = {
  z,
  idParamSchema,
  paginationSchema,
  idsBodySchema,
};
