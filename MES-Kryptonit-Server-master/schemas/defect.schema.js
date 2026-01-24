const { z, idParamSchema } = require("./common");

const defectCreateSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
  })
  .passthrough();

const defectUpdateSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

module.exports = {
  defectCreateSchema,
  defectUpdateSchema,
  defectIdParamSchema: idParamSchema,
};
