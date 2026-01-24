const { z, idParamSchema } = require("../common");

const userUpdateSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    password: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
  })
  .passthrough();

const userImageSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .passthrough();

module.exports = {
  userUpdateSchema,
  userImageSchema,
  userIdParamSchema: idParamSchema,
};
