import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CHECKED_IN = 'Checked-in',
  CHECKED_OUT = 'Checked-out',
  CANCELLED = 'Cancelled',
}

export class BookingServiceItemDto {
  @IsString()
  service_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBookingDto {
  @IsString()
  customer_id: string;

  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsDateString()
  check_in_date: string;

  @IsDateString()
  check_out_date: string;

  @IsString()
  room_type_id: string;

  @IsArray()
  @IsString({ each: true })
  room_ids: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceItemDto)
  services?: BookingServiceItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsDateString()
  actual_check_in?: string;

  @IsOptional()
  @IsDateString()
  actual_check_out?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_room_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_service_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grand_total?: number;
}

export class QueryBookingDto {
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

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsDateString()
  check_in_date?: string;

  @IsOptional()
  @IsDateString()
  check_out_date?: string;
}