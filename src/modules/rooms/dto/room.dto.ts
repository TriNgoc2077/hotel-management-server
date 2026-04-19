import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RoomStatus {
  VACANT = 'Vacant',
  RESERVED = 'Reserved',
  OCCUPIED = 'Occupied',
  OUT_OF_ORDER = 'Out_of_Order',
}

export class CreateRoomDto {
  @IsString()
  room_number: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsString()
  room_type_id: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  room_number?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsString()
  room_type_id?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

export class QueryRoomDto {
  @IsOptional()
  @IsString()
  room_type_id?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  // ✅ FIX: thêm @Type(() => Number), @IsInt(), @Min(1)
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
