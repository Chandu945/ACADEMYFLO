import { IsIn, Matches } from 'class-validator';

export class AppVersionQueryDto {
  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must match the format MAJOR.MINOR.PATCH' })
  version!: string;
}
