import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { ExpenseCategoryRepository } from '@domain/expense/ports/expense-category.repository';
import { ExpenseCategory } from '@domain/expense/entities/expense-category.entity';
import { ExpenseCategoryModel } from '../database/schemas/expense-category.schema';
import type { ExpenseCategoryDocument } from '../database/schemas/expense-category.schema';
import { getTransactionSession } from '../database/transaction-context';
import { escapeRegex } from '@shared/utils/escape-regex';

/** M1 fix: shared name-normalization (trim + lowercase). Co-located with the
 *  save and lookup paths so both produce the same key. */
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

@Injectable()
export class MongoExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(
    @InjectModel(ExpenseCategoryModel.name)
    private readonly model: Model<ExpenseCategoryDocument>,
  ) {}

  async save(category: ExpenseCategory): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: category.id.toString() },
      {
        _id: category.id.toString(),
        academyId: category.academyId,
        name: category.name,
        // M1 fix (expense audit): write the normalized form alongside name
        // so the (academyId, nameNormalized) partial-unique index can
        // enforce case-insensitive uniqueness at the DB layer. Pre-fix the
        // JS-only check was TOCTOU-vulnerable.
        nameNormalized: normalize(category.name),
        createdBy: category.createdBy,
      },
      { upsert: true, session: getTransactionSession() },
    );
  }

  async findById(id: string): Promise<ExpenseCategory | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async findByAcademyAndName(academyId: string, name: string): Promise<ExpenseCategory | null> {
    // M1 fix: prefer the indexed nameNormalized lookup. Falls back to the
    // pre-fix case-insensitive regex when no normalized match (covers rows
    // written before this fix that haven't been backfilled yet). The regex
    // path uses escapeRegex so name is safe from regex injection.
    const normalized = normalize(name);
    const byNormalized = await this.model
      .findOne({ academyId, nameNormalized: normalized })
      .lean()
      .exec();
    if (byNormalized) {
      return this.toDomain(byNormalized as unknown as Record<string, unknown>);
    }
    const byRegex = await this.model
      .findOne({ academyId, name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') } })
      .lean()
      .exec();
    return byRegex ? this.toDomain(byRegex as unknown as Record<string, unknown>) : null;
  }

  async listByAcademy(academyId: string): Promise<ExpenseCategory[]> {
    const docs = await this.model.find({ academyId }).sort({ name: 1 }).lean().exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }, { session: getTransactionSession() });
  }

  private toDomain(doc: unknown): ExpenseCategory {
    const d = doc as {
      _id: string;
      academyId: string;
      name: string;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
    };

    return ExpenseCategory.reconstitute(String(d._id), {
      academyId: d.academyId,
      name: d.name,
      createdBy: d.createdBy,
      audit: {
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: 1,
      },
    });
  }
}
