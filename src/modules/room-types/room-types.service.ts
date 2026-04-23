import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  QueryRoomTypeDto,
} from './dto/room-type.dto';
import { RoomStatus } from '../rooms/dto/room.dto';
import { PaginatedResponseDto } from '@/common/dto/response.dto';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class RoomTypesService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
  ) {}

  async findAll(query: QueryRoomTypeDto, isPublic: number = 1): Promise<PaginatedResponseDto<any>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const [countRows] = await this.db.query(
      'SELECT COUNT(*) as totalItems FROM v_room_types WHERE isPublic = ?',
      [isPublic],
    );
    const totalItems = (countRows as RowDataPacket[])[0]?.totalItems ?? 0;

    // Pagination overflow guard
    if (totalItems > 0 && offset >= totalItems) {
      return {
        meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
        result: [],
      };
    }

    const [rows] = await this.db.query(
      'SELECT * FROM v_room_types WHERE isPublic = ? ORDER BY name ASC LIMIT ? OFFSET ?',
      [isPublic, limit, offset],
    );

    return {
      meta: {
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
      },
      result: rows as RowDataPacket[],
    };
  }

  // findOne dùng cho GET/:id từ controller — không lock, chỉ read
  async findOne(id: string) {
    const [rows] = await this.db.execute(
      'SELECT * FROM v_room_types WHERE id = ?',
      [id],
    );
    const result = (rows as RowDataPacket[])[0];
    if (!result) throw new NotFoundException(`Room type ${id} not found`);
    return result;
  }

  async create(dto: CreateRoomTypeDto) {
    const id = uuidv4();
    return this.dbService.withTransaction(async (conn) => {
      await conn.execute('CALL sp_create_room_type(?,?,?,?,?,?,?)', [
        id,
        dto.name,
        dto.description ?? null,
        dto.images ? JSON.stringify(dto.images) : null,
        dto.base_price,
        dto.capacity,
        dto.price_per_night ?? null,
      ]);
      return { id };
    });
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    // Fix TOCTOU: check + lock nằm trong cùng transaction
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM v_room_types WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Room type ${id} not found`);
      }

      await conn.execute('CALL sp_update_room_type(?,?,?,?,?,?,?)', [
        id,
        dto.name ?? null,
        dto.description ?? null,
        dto.images ? JSON.stringify(dto.images) : null,
        dto.base_price ?? null,
        dto.capacity ?? null,
        dto.price_per_night ?? null,
      ]);
      return { id };
    });
  }

  async remove(id: string) {
    // Fix TOCTOU + consistent lock order: room_types trước, rooms sau
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM room_types WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Room type ${id} not found`);
      }

      // Lock rooms theo thứ tự nhất quán → tránh deadlock với RoomsService
      await conn.execute(
        `UPDATE rooms
         SET status = ?
         WHERE room_type_id = ?
           AND deleted_at IS NULL
           AND status != ?`,
        [RoomStatus.OUT_OF_ORDER, id, RoomStatus.OUT_OF_ORDER],
      );
      await conn.execute(
        'UPDATE room_types SET deleted_at = NOW() WHERE id = ?',
        [id],
      );
      return { id };
    });
  }
}
