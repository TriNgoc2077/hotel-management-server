import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum ReportType {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType = ReportType.DAY;
}
