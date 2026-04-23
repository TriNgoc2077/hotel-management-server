import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  CreateRoomDto,
  UpdateRoomDto,
  QueryRoomDto,
  RoomStatus,
} from './dto/room.dto';
import { PaginatedResponseDto } from '@/common/dto/response.dto';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
  ) {}

  async findAll(query: QueryRoomDto, isPublic: number = 1): Promise<PaginatedResponseDto<any>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const countParams: any[] = [isPublic];
    let countSql = 'SELECT COUNT(*) as totalItems FROM v_rooms WHERE isPublic = ?';

    if (query.room_type_id) {
      countSql += ' AND roomTypeId = ?';
      countParams.push(query.room_type_id);
    }
    if (query.status) {
      countSql += ' AND status = ?';
      countParams.push(query.status);
    }

    const [countRows] = await this.db.query(countSql, countParams);
    const totalItems = (countRows as RowDataPacket[])[0]?.totalItems ?? 0;

    if (totalItems > 0 && offset >= totalItems) {
      return {
        meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
        result: [],
      };
    }

    let sql = 'SELECT * FROM v_rooms WHERE isPublic = ?';
    const params: any[] = [isPublic];

    if (query.room_type_id) sql += ' AND roomTypeId = ?';
    if (query.status) sql += ' AND status = ?';

    sql += ' ORDER BY roomNumber ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.db.query(sql, params);

    return {
      meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
      result: rows as RowDataPacket[],
    };
  }

  // findOne dùng cho GET/:id từ controller — không lock, chỉ read
  async findOne(id: string) {
    const [rows] = await this.db.execute(
      'SELECT * FROM v_rooms WHERE id = ?',
      [id],
    );
    const result = (rows as RowDataPacket[])[0];
    if (!result) throw new NotFoundException(`Room ${id} not found`);
    return result;
  }

  async create(dto: CreateRoomDto) {
    const id = uuidv4();
    return this.dbService.withTransaction(async (conn) => {
      await conn.execute('CALL sp_create_room(?,?,?,?,?,?)', [
        id,
        dto.room_number,
        dto.description ?? null,
        dto.is_public ?? true,
        dto.room_type_id,
        dto.status ?? RoomStatus.VACANT,
      ]);
      return { id };
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    // Fix TOCTOU: check + lock trong cùng transaction
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM v_rooms WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Room ${id} not found`);
      }

      await conn.execute('CALL sp_update_room(?,?,?,?,?,?)', [
        id,
        dto.room_number ?? null,
        dto.description ?? null,
        dto.is_public ?? null,
        dto.room_type_id ?? null,
        dto.status ?? null,
      ]);
      return { id };
    });
  }

  async remove(id: string) {
    // Fix TOCTOU: check + lock trong cùng transaction
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Room ${id} not found`);
      }

      await conn.execute(
        'UPDATE rooms SET status = ?, deleted_at = NOW() WHERE id = ?',
        [RoomStatus.OUT_OF_ORDER, id],
      );
      return { id };
    });
  }
}
