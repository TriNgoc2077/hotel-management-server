import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  CreateBookingDto,
  UpdateBookingDto,
  QueryBookingDto,
  BookingStatus,
} from './dto/booking.dto';
import { PaginatedResponseDto } from '@/common/dto/response.dto';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class BookingsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
  ) {}

  async findAll(query: QueryBookingDto): Promise<PaginatedResponseDto<any>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const countParams: any[] = [];
    let countSql = 'SELECT COUNT(*) as totalItems FROM v_bookings WHERE 1=1';

    if (query.status) {
      countSql += ' AND status = ?';
      countParams.push(query.status);
    }
    if (query.customer_id) {
      countSql += ' AND customer_id = ?';
      countParams.push(query.customer_id);
    }
    if (query.check_in_date) {
      countSql += ' AND check_in_date >= ?';
      countParams.push(query.check_in_date);
    }
    if (query.check_out_date) {
      countSql += ' AND check_out_date <= ?';
      countParams.push(query.check_out_date);
    }

    const [countRows] = await this.db.execute(countSql, countParams);
    const totalItems = (countRows as RowDataPacket[])[0]?.totalItems ?? 0;

    if (totalItems > 0 && offset >= totalItems) {
      return {
        meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
        result: [],
      };
    }

    let sql = 'SELECT * FROM v_bookings WHERE 1=1';
    const params: any[] = [...countParams];

    if (query.status) sql += ' AND status = ?';
    if (query.customer_id) sql += ' AND customer_id = ?';
    if (query.check_in_date) sql += ' AND check_in_date >= ?';
    if (query.check_out_date) sql += ' AND check_out_date <= ?';

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.db.execute(sql, params);

    return {
      meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
      result: rows as RowDataPacket[],
    };
  }

  async findOne(id: string) {
    const [rows] = await this.db.execute('CALL sp_find_booking_by_id(?)', [id]);
    const resultSets = rows as RowDataPacket[][];

    const booking = resultSets[0]?.[0];
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    return {
      ...booking,
      rooms: resultSets[1] ?? [],
      services: resultSets[2] ?? [],
    };
  }

  async findAvailableRoomTypes(
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
  ) {
    if (!roomTypeId || !checkIn || !checkOut) {
      throw new BadRequestException(
        'room_type_id, check_in, check_out are required',
      );
    }

    const [rows] = await this.db.execute(
      'CALL sp_find_available_room_types(?,?,?)',
      [roomTypeId, checkIn, checkOut],
    );
    return (rows as RowDataPacket[][])[0] ?? [];
  }

  async create(dto: CreateBookingDto) {
    const id = uuidv4();
    const shortId = id.slice(0, 8).toUpperCase();

    const services =
      dto.services && dto.services.length > 0
        ? dto.services.map((s) => ({
            serviceId: s.service_id,
            quantity: s.quantity,
          }))
        : null;

    await this.db.execute('CALL sp_create_booking(?,?,?,?,?,?,?,?,?,?)', [
      id,
      shortId,
      dto.customer_id,
      dto.staff_id ?? null,
      dto.check_in_date,
      dto.check_out_date,
      dto.room_type_id,
      JSON.stringify(dto.room_ids),
      services ? JSON.stringify(services) : null,
      dto.discount ?? 0,
    ]);

    return { id };
  }

  async update(id: string, dto: UpdateBookingDto) {
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, status FROM bookings WHERE id = ? FOR UPDATE',
        [id],
      );
      const booking = (rows as RowDataPacket[])[0];
      if (!booking) throw new NotFoundException(`Booking ${id} not found`);

      if (
        [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED].includes(
          booking.status,
        )
      ) {
        throw new BadRequestException(
          `Cannot update a booking with status: ${booking.status}`,
        );
      }

      await conn.execute('CALL sp_update_booking(?,?,?,?,?,?,?)', [
        id,
        dto.status ?? null,
        dto.actual_check_in ?? null,
        dto.actual_check_out ?? null,
        dto.total_room_price ?? null,
        dto.total_service_price ?? null,
        dto.grand_total ?? null,
      ]);

      return { id };
    });
  }

  async remove(id: string) {
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, status FROM bookings WHERE id = ? FOR UPDATE',
        [id],
      );
      const booking = (rows as RowDataPacket[])[0];
      if (!booking) throw new NotFoundException(`Booking ${id} not found`);

      if (
        [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT].includes(
          booking.status,
        )
      ) {
        throw new BadRequestException(
          `Cannot cancel a booking with status: ${booking.status}`,
        );
      }

      await conn.execute('CALL sp_update_booking(?,?,?,?,?,?,?)', [
        id,
        BookingStatus.CANCELLED,
        null,
        null,
        null,
        null,
        null,
      ]);

      return { id };
    });
  }
}