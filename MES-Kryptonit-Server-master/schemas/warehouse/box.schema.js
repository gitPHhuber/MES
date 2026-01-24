const { z, paginationSchema, idParamSchema, idsBodySchema } = require("../common");

const boxFiltersSchema = paginationSchema
  .extend({
    search: z.string().optional(),
    status: z.string().optional(),
    label: z.string().optional(),
    batchName: z.string().optional(),
    projectName: z.string().optional(),
    supplyId: z.coerce.number().int().optional(),
    currentSectionId: z.coerce.number().int().optional(),
    currentTeamId: z.coerce.number().int().optional(),
  })
  .passthrough();

const createBoxSchema = z
  .object({
    supplyId: z.coerce.number().int().optional(),
    sectionId: z.coerce.number().int().optional(),
    itemName: z.string().min(1),
    quantity: z.coerce.number().int().positive().optional(),
    unit: z.string().optional(),
    kitNumber: z.string().optional(),
    comment: z.string().optional(),
  })
  .passthrough();

const createBoxesBatchSchema = z
  .object({
    label: z.string().min(1),
    projectName: z.string().optional(),
    batchName: z.string().optional(),
    originType: z.string().optional(),
    originId: z.coerce.number().int().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    itemsPerBox: z.coerce.number().int().positive().optional(),
    unit: z.string().optional(),
    status: z.string().optional(),
    currentSectionId: z.coerce.number().int().optional(),
    currentTeamId: z.coerce.number().int().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const updateBatchSchema = z
  .object({
    ids: idsBodySchema.shape.ids,
    updates: z
      .object({
        label: z.string().optional(),
        quantity: z.coerce.number().int().positive().optional(),
        unit: z.string().optional(),
        status: z.string().optional(),
        batchName: z.string().optional(),
        projectName: z.string().optional(),
        notes: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const movementSchema = z
  .object({
    boxId: z.coerce.number().int().positive(),
    operation: z.string().min(1),
    toSectionId: z.coerce.number().int().optional(),
    toTeamId: z.coerce.number().int().optional(),
    statusAfter: z.string().optional(),
    deltaQty: z.coerce.number().optional(),
    goodQty: z.coerce.number().optional().nullable(),
    scrapQty: z.coerce.number().optional().nullable(),
    comment: z.string().optional(),
    documentId: z.coerce.number().int().optional(),
  })
  .passthrough();

const movementBatchSchema = z
  .object({
    docNumber: z.string().optional(),
    items: z
      .array(
        z
          .object({
            boxId: z.coerce.number().int().positive().optional(),
            box: z
              .object({
                id: z.coerce.number().int().positive(),
              })
              .optional(),
            operation: z.string().min(1),
            toSectionId: z.coerce.number().int().optional(),
            toTeamId: z.coerce.number().int().optional(),
            statusAfter: z.string().optional(),
            deltaQty: z.coerce.number().optional(),
            goodQty: z.coerce.number().optional().nullable(),
            scrapQty: z.coerce.number().optional().nullable(),
            comment: z.string().optional(),
          })
          .passthrough()
      )
      .nonempty(),
  })
  .passthrough();

const movementFiltersSchema = paginationSchema
  .extend({
    search: z.string().optional(),
    boxId: z.coerce.number().int().optional(),
    operation: z.string().optional(),
    fromSectionId: z.coerce.number().int().optional(),
    toSectionId: z.coerce.number().int().optional(),
    fromTeamId: z.coerce.number().int().optional(),
    toTeamId: z.coerce.number().int().optional(),
    statusAfter: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .passthrough();

module.exports = {
  genericBodySchema: z.object({}).passthrough(),
  boxFiltersSchema,
  createBoxSchema,
  createBoxesBatchSchema,
  updateBatchSchema,
  movementSchema,
  movementBatchSchema,
  movementFiltersSchema,
  boxIdParamSchema: idParamSchema,
  idsBodySchema,
};
