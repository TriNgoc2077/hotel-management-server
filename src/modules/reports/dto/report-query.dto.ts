import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum ReportType {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class ReportQueryDto {
  @IsOptional()

  startDate?: string;

  @IsOptional()

  endDate?: string;

  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType = ReportType.DAY;
}
