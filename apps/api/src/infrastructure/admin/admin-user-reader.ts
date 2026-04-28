import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  UserModel,
  type UserDocument,
} from '../database/schemas/user.schema';
import type { Paginated, UserRole } from '@academyflo/contracts';
import type {
  AdminUserReader,
  AdminUserSearchFilter,
  AdminUserRecord,
} from '@application/admin/ports/admin-user-reader.port';

/**
 * Cross-academy user search for super-admins. Read-only.
 *
 * Search strategy: free-text `q` matches against fullName, emailNormalized,
 * or phoneE164 (case-insensitive contains via regex). The unique indexes on
 * email + phone make those branches index-friendly; the name branch falls
 * back to a collection scan, which is acceptable while the user count stays
 * in the tens of thousands. If we hit > 100k users we should add a text
 * index on fullName, but that's an indexing-day decision, not v1.
 */
@Injectable()
export class MongoAdminUserReader implements AdminUserReader {
  constructor(@InjectModel(UserModel.name) private readonly model: Model<UserDocument>) {}

  async search(filter: AdminUserSearchFilter): Promise<Paginated<AdminUserRecord>> {
    const query: Record<string, unknown> = {};

    if (filter.role) query['role'] = filter.role;
    if (filter.academyId) query['academyId'] = filter.academyId;
    if (filter.status) query['status'] = filter.status;

    if (filter.q && filter.q.trim().length > 0) {
      const escaped = escapeRegex(filter.q.trim());
      const re = new RegExp(escaped, 'i');
      query['$or'] = [
        { fullName: re },
        { emailNormalized: re },
        { phoneE164: re },
      ];
    }

    const skip = (filter.page - 1) * filter.pageSize;

    const [docs, totalItems] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean()
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const items: AdminUserRecord[] = docs.map((d) => {
      const doc = d as unknown as {
        _id: string;
        fullName: string;
        emailNormalized: string;
        phoneE164: string;
        role: string;
        status: string;
        academyId: string | null;
        createdAt: Date;
      };
      return {
        id: doc._id,
        fullName: doc.fullName,
        emailNormalized: doc.emailNormalized,
        phoneE164: doc.phoneE164,
        role: doc.role as UserRole,
        status: doc.status as 'ACTIVE' | 'INACTIVE',
        academyId: doc.academyId,
        createdAt: doc.createdAt,
      };
    });

    return {
      items,
      meta: {
        page: filter.page,
        pageSize: filter.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.pageSize),
      },
    };
  }
}

/**
 * Escape a string for safe inclusion in a RegExp. Without this, characters
 * like `.+*?()[]\` in the search query become regex metacharacters and
 * either error out or match more aggressively than intended.
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
