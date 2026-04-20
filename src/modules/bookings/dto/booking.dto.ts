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
  serviceId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBookingDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsString()
  checkInDate: string;

  @IsString()
  checkOutDate: string;

  @IsString()
  roomTypeId: string;

  @IsArray()
  @IsString({ each: true })
  roomIds: string[];

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
  actualCheckIn?: string;

  @IsOptional()
  actualCheckOut?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRoomPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalServicePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grandTotal?: number;
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
  customerId?: string;

  @IsOptional()
  checkInDate?: string;

  @IsOptional()
  checkOutDate?: string;
}