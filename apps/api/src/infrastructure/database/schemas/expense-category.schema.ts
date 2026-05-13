import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategoryModel>;

@Schema({
  collection: 'expense_categories',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  _id: false,
})
export class ExpenseCategoryModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  academyId!: string;

  @Prop({ required: true })
  name!: string;

  /**
   * Lowercase + trimmed copy of `name`. Stored separately so we can index it
   * unique on (academyId, nameNormalized) and catch the "Travel" vs "travel"
   * case-mismatch race (M1 expense audit). Maintained by the repo on every
   * write — the entity layer treats name as canonical.
   */
  @Prop({ required: false })
  nameNormalized?: string;

  @Prop({ required: true })
  createdBy!: string;
}

export const ExpenseCategorySchema = SchemaFactory.createForClass(ExpenseCategoryModel);

// Legacy case-sensitive index. Kept so the case-sensitive duplicate "Travel"
// + "Travel" is still rejected (was the only thing enforcing duplicates
// pre-M1). Removable once all rows have nameNormalized backfilled and the
// new partial unique below has fully taken over.
ExpenseCategorySchema.index({ academyId: 1, name: 1 }, { unique: true });

// M1 fix (expense audit): case-insensitive unique enforcement. Partial so
// pre-backfill rows that don't yet have nameNormalized aren't rejected by
// Mongo's existing-data validation. New writes always populate it via the
// repo, so over time every row gains coverage.
ExpenseCategorySchema.index(
  { academyId: 1, nameNormalized: 1 },
  { unique: true, partialFilterExpression: { nameNormalized: { $exists: true } } },
);
