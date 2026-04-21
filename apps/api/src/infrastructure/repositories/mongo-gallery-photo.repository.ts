import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import { GalleryPhoto } from '@domain/event/entities/gallery-photo.entity';
import { GalleryPhotoModel } from '../database/schemas/gallery-photo.schema';
import { getTransactionSession } from '../database/transaction-context';

@Injectable()
export class MongoGalleryPhotoRepository implements GalleryPhotoRepository {
  constructor(@InjectModel(GalleryPhotoModel.name) private readonly model: Model<GalleryPhotoModel>) {}

  async save(photo: GalleryPhoto): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: photo.id.toString() },
      {
        _id: photo.id.toString(),
        eventId: photo.eventId,
        academyId: photo.academyId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        uploadedBy: photo.uploadedBy,
        uploadedByName: photo.uploadedByName,
      },
      { upsert: true, session: getTransactionSession() },
    );
  }

  async findById(id: string): Promise<GalleryPhoto | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async listByEventId(eventId: string): Promise<GalleryPhoto[]> {
    const docs = await this.model.find({ eventId }).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }, { session: getTransactionSession() }).exec();
  }

  async deleteAllByEventId(eventId: string, academyId: string): Promise<void> {
    await this.model
      .deleteMany({ eventId, academyId }, { session: getTransactionSession() })
      .exec();
  }

  async countByEventId(eventId: string): Promise<number> {
    return this.model.countDocuments({ eventId }).exec();
  }

  private toDomain(doc: unknown): GalleryPhoto {
    const d = doc as {
      _id: string;
      eventId: string;
      academyId: string;
      url: string;
      thumbnailUrl: string | null;
      caption: string | null;
      uploadedBy: string;
      uploadedByName: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    return GalleryPhoto.reconstitute(String(d._id), {
      eventId: String(d.eventId),
      academyId: String(d.academyId),
      url: d.url,
      thumbnailUrl: d.thumbnailUrl ?? null,
      caption: d.caption ?? null,
      uploadedBy: String(d.uploadedBy),
      uploadedByName: d.uploadedByName ?? null,
      audit: {
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
        version: 1,
      },
    });
  }
}
