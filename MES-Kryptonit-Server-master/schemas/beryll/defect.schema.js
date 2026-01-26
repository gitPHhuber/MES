const { z, paginationSchema, idParamSchema } = require("../common");

const defectFiltersSchema = paginationSchema
  .extend({
    serverId: z.coerce.number().int().optional(),
    status: z.string().optional(),
    repairPartType: z.string().optional(),
    diagnosticianId: z.coerce.number().int().optional(),
    isRepeatedDefect: z.enum(["true", "false"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
    slaBreached: z.enum(["true", "false"]).optional(),
  })
  .passthrough();

const defectCreateSchema = z
  .object({
    serverId: z.coerce.number().int().positive(),
    description: z.string().optional(),
    status: z.string().optional(),
    repairPartType: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const defectCompleteDiagnosisSchema = z
  .object({
    repairPartType: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const defectNotesSchema = z
  .object({
    notes: z.string().optional(),
  })
  .passthrough();

const defectInventorySchema = z
  .object({
    inventoryId: z.coerce.number().int().positive(),
  })
  .passthrough();

const defectSubstituteSchema = z
  .object({
    substituteServerId: z.coerce.number().int().positive(),
  })
  .passthrough();

module.exports = {
  defectFiltersSchema,
  defectCreateSchema,
  defectCompleteDiagnosisSchema,
  defectNotesSchema,
  defectInventorySchema,
  defectSubstituteSchema,
  defectIdParamSchema: idParamSchema,
};
