import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { AcademyInfoDto } from '../dtos/parent.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetAcademyInfoInput {
  parentUserId: string;
  parentRole: UserRole;
}

export class GetAcademyInfoUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: GetAcademyInfoInput): Promise<Result<AcademyInfoDto, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return err(ParentErrors.childNotLinked());

    const academyId = links[0]!.academyId;
    const academy = await this.academyRepo.findById(academyId);
    if (!academy) return err(ParentErrors.childNotLinked());

    return ok({
      academyName: academy.academyName,
      address: academy.address
        ? {
            line1: academy.address.line1,
            line2: academy.address.line2,
            city: academy.address.city,
            state: academy.address.state,
            pincode: academy.address.pincode,
            country: academy.address.country,
          }
        : {
            line1: '',
            line2: undefined,
            city: '',
            state: '',
            pincode: '',
            country: '',
          },
    });
  }
}
