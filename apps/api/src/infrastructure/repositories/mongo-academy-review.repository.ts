import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  AcademyReviewRepository,
  AcademyReviewSummary,
} from '@domain/review/ports/academy-review.repository';
import { AcademyReview } from '@domain/review/entities/academy-review.entity';
import { AcademyReviewModel } from '../database/schemas/academy-review.schema';
import type { AcademyReviewDocument } from '../database/schemas/academy-review.schema';
import { getTransactionSession } from '../database/transaction-context';

@Injectable()
export class MongoAcademyReviewRepository implements AcademyReviewRepository {
  constructor(
    @InjectModel(AcademyReviewModel.name)
    private readonly model: Model<AcademyReviewDocument>,
  ) {}

  async save(review: AcademyReview): Promise<void> {
    await this.model.findOneAndUpdate(
      { academyId: review.academyId, parentUserId: review.parentUserId },
      {
        _id: review.id.toString(),
        academyId: review.academyId,
        parentUserId: review.parentUserId,
        rating: review.rating,
        comment: review.comment,
        version: review.audit.version,
      },
      { upsert: true, session: getTransactionSession() },
    );
  }

  async findByAcademyAndParent(
    academyId: string,
    parentUserId: string,
  ): Promise<AcademyReview | null> {
    const doc = await this.model.findOne({ academyId, parentUserId }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async deleteByAcademyAndParent(
    academyId: string,
    parentUserId: string,
  ): Promise<void> {
    await this.model.deleteOne(
      { academyId, parentUserId },
      { session: getTransactionSession() },
    );
  }

  async listByAcademy(academyId: string): Promise<AcademyReview[]> {
    const docs = await this.model
      .find({ academyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc as unknown as Record<string, unknown>));
  }

  async summaryByAcademy(academyId: string): Promise<AcademyReviewSummary> {
    // Group by rating to build count + distribution in one round trip.
    const agg = await this.model
      .aggregate<{ _id: number; count: number }>([
        { $match: { academyId } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ])
      .exec();

    const distribution: AcademyReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let weighted = 0;
    for (const row of agg) {
      const r = row._id as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) {
        distribution[r] = row.count;
        total += row.count;
        weighted += row.count * r;
      }
    }

    return {
      count: total,
      averageRating: total === 0 ? 0 : Math.round((weighted / total) * 10) / 10,
      distribution,
    };
  }

  private toDomain(doc: unknown): AcademyReview {
    const d = doc as {
      _id: string;
      academyId: string;
      parentUserId: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };

    return AcademyReview.reconstitute(String(d._id), {
      academyId: d.academyId,
      parentUserId: d.parentUserId,
      rating: d.rating,
      comment: d.comment ?? null,
      audit: {
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: d.version ?? 1,
      },
    });
  }
}
