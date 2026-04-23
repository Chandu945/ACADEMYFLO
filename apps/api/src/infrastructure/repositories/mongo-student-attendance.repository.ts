import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import { StudentAttendance } from '@domain/attendance/entities/student-attendance.entity';
import { StudentAttendanceModel } from '../database/schemas/student-attendance.schema';
import type { StudentAttendanceDocument } from '../database/schemas/student-attendance.schema';
import { getTransactionSession } from '../database/transaction-context';
import { escapeRegex } from '@shared/utils/escape-regex';

@Injectable()
export class MongoStudentAttendanceRepository implements StudentAttendanceRepository {
  constructor(
    @InjectModel(StudentAttendanceModel.name)
    private readonly model: Model<StudentAttendanceDocument>,
  ) {}

  async save(record: StudentAttendance): Promise<void> {
    await this.model.findOneAndUpdate(
      {
        academyId: record.academyId,
        studentId: record.studentId,
        batchId: record.batchId,
        date: record.date,
      },
      {
        _id: record.id.toString(),
        academyId: record.academyId,
        studentId: record.studentId,
        batchId: record.batchId,
        date: record.date,
        markedByUserId: record.markedByUserId,
        version: record.audit.version,
      },
      { upsert: true, session: getTransactionSession() },
    );
  }

  async deleteByAcademyStudentBatchDate(
    academyId: string,
    studentId: string,
    batchId: string,
    date: string,
  ): Promise<void> {
    await this.model.deleteOne(
      { academyId, studentId, batchId, date },
      { session: getTransactionSession() },
    );
  }

  async findByAcademyStudentBatchDate(
    academyId: string,
    studentId: string,
    batchId: string,
    date: string,
  ): Promise<StudentAttendance | null> {
    const doc = await this.model
      .findOne({ academyId, studentId, batchId, date })
      .lean()
      .exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async findPresentByAcademyBatchAndDate(
    academyId: string,
    batchId: string,
    date: string,
  ): Promise<StudentAttendance[]> {
    const docs = await this.model.find({ academyId, batchId, date }).lean().exec();
    return docs.map((doc) => this.toDomain(doc as unknown as Record<string, unknown>));
  }

  async findPresentByAcademyAndDate(
    academyId: string,
    date: string,
  ): Promise<StudentAttendance[]> {
    const docs = await this.model.find({ academyId, date }).lean().exec();
    return docs.map((doc) => this.toDomain(doc as unknown as Record<string, unknown>));
  }

  async findPresentByAcademyStudentAndMonth(
    academyId: string,
    studentId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]> {
    const docs = await this.model
      .find({
        academyId,
        studentId,
        date: { $regex: `^${escapeRegex(monthPrefix)}` },
      })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc as unknown as Record<string, unknown>));
  }

  async findPresentByAcademyAndMonth(
    academyId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]> {
    const docs = await this.model
      .find({
        academyId,
        date: { $regex: `^${escapeRegex(monthPrefix)}` },
      })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc as unknown as Record<string, unknown>));
  }

  async deleteByAcademyAndDate(academyId: string, date: string): Promise<void> {
    await this.model.deleteMany({ academyId, date }, { session: getTransactionSession() });
  }

  async countPresentByAcademyAndDate(academyId: string, date: string): Promise<number> {
    return this.model.countDocuments({ academyId, date });
  }

  async countDistinctStudentsPresentByAcademyAndDate(
    academyId: string,
    date: string,
  ): Promise<number> {
    // DB-side distinct so a two-batch student doesn't double the KPI.
    const distinctIds = await this.model.distinct('studentId', { academyId, date });
    return distinctIds.length;
  }

  async deleteAllByAcademyAndStudent(
    academyId: string,
    studentId: string,
  ): Promise<number> {
    const res = await this.model.deleteMany(
      { academyId, studentId },
      { session: getTransactionSession() },
    );
    return res.deletedCount ?? 0;
  }

  private toDomain(doc: unknown): StudentAttendance {
    const d = doc as {
      _id: string;
      academyId: string;
      studentId: string;
      batchId: string;
      date: string;
      markedByUserId: string;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };

    return StudentAttendance.reconstitute(String(d._id), {
      academyId: d.academyId,
      studentId: d.studentId,
      batchId: d.batchId,
      date: d.date,
      markedByUserId: d.markedByUserId,
      audit: {
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: d.version ?? 1,
      },
    });
  }
}
