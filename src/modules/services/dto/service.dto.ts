import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum ServiceType {
  FNB = 'F&B',
  SPA = 'Spa',
  LAUNDRY = 'Laundry',
  TRANSPORTATION = 'Transportation',
  OTHER = 'Other',
}

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @IsOptional()
  @IsInt()
  quantity?: number; // -1 = unlimited
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @IsOptional()
  @IsInt()
  quantity?: number;
}

export class AddBookingServiceDto {
  @IsString()
  service_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

// ✅ FIX: thêm @Type(() => Number), @IsInt(), @Min(1)
export class QueryServiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}