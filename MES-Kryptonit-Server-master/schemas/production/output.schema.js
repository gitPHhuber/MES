const { z, paginationSchema, idParamSchema, idsBodySchema } = require("../common");

const operationTypeBodySchema = z
  .object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    normMinutes: z.coerce.number().optional(),
    sectionId: z.coerce.number().int().optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .passthrough();

const operationTypeUpdateSchema = operationTypeBodySchema.partial();

const outputFiltersSchema = paginationSchema
  .extend({
    userId: z.coerce.number().int().optional(),
    teamId: z.coerce.number().int().optional(),
    sectionId: z.coerce.number().int().optional(),
    projectId: z.coerce.number().int().optional(),
    taskId: z.coerce.number().int().optional(),
    operationTypeId: z.coerce.number().int().optional(),
    status: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .passthrough();

const outputCreateSchema = z
  .object({
    date: z.string().min(1),
    userId: z.coerce.number().int().positive(),
    projectId: z.coerce.number().int().optional(),
    taskId: z.coerce.number().int().optional(),
    operationTypeId: z.coerce.number().int().optional(),
    claimedQty: z.coerce.number().positive(),
    comment: z.string().optional(),
  })
  .passthrough();

const outputUpdateSchema = z
  .object({
    date: z.string().optional(),
    userId: z.coerce.number().int().optional(),
    projectId: z.coerce.number().int().optional(),
    taskId: z.coerce.number().int().optional(),
    operationTypeId: z.coerce.number().int().optional(),
    claimedQty: z.coerce.number().optional(),
    approvedQty: z.coerce.number().optional(),
    status: z.string().optional(),
    comment: z.string().optional(),
  })
  .passthrough();

const approvalSchema = z
  .object({
    ids: idsBodySchema.shape.ids,
    adjustments: z.record(z.coerce.number()).optional(),
  })
  .passthrough();

const rejectSchema = z
  .object({
    ids: idsBodySchema.shape.ids,
    reason: z.string().optional(),
  })
  .passthrough();

const summaryQuerySchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .passthrough();

module.exports = {
  operationTypeBodySchema,
  operationTypeUpdateSchema,
  outputFiltersSchema,
  outputCreateSchema,
  outputUpdateSchema,
  approvalSchema,
  rejectSchema,
  summaryQuerySchema,
  outputIdParamSchema: idParamSchema,
  userIdParamSchema: z.object({ userId: z.coerce.number().int().positive() }),
};
