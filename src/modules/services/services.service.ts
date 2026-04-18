import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  CreateServiceDto,
  UpdateServiceDto,
  AddBookingServiceDto,
  QueryServiceDto,
  ServiceStatus,
  ServiceType,
} from './dto/service.dto';
import { BookingStatus } from '../bookings/dto/booking.dto';
import { PaginatedResponseDto } from '@/common/dto/response.dto';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
  ) {}

  async findAll(query: QueryServiceDto): Promise<PaginatedResponseDto<any>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const [rows] = await this.db.execute('CALL sp_get_services(?,?)', [
      limit,
      offset,
    ]);
    const resultSets = rows as RowDataPacket[][];
    const totalItems = resultSets[0]?.[0]?.totalItems ?? 0;
    const result = resultSets[1] ?? [];

    return {
      meta: {
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
      },
      result,
    };
  }

  // findOne dùng cho GET/:id từ controller — không lock, chỉ read
  async findOne(id: string) {
    const [rows] = await this.db.execute('CALL sp_get_service_by_id(?)', [id]);
    const result = (rows as RowDataPacket[][])[0]?.[0];
    if (!result) throw new NotFoundException(`Service ${id} not found`);
    return result;
  }

  async create(dto: CreateServiceDto) {
    const id = uuidv4();
    return this.dbService.withTransaction(async (conn) => {
      await conn.execute('CALL sp_create_service(?,?,?,?,?,?,?)', [
        id,
        dto.name,
        dto.description ?? null,
        dto.price,
        dto.status ?? ServiceStatus.ACTIVE,
        dto.type ?? ServiceType.OTHER,
        dto.quantity ?? -1,
      ]);
      return { id };
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    // Fix TOCTOU: check + lock trong cùng transaction
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM services WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Service ${id} not found`);
      }

      await conn.execute('CALL sp_update_service(?,?,?,?,?,?,?)', [
        id,
        dto.name ?? null,
        dto.description ?? null,
        dto.price ?? null,
        dto.status ?? null,
        dto.type ?? null,
        dto.quantity ?? null,
      ]);
      return { id };
    });
  }

  async remove(id: string) {
    // Fix TOCTOU: check + lock trong cùng transaction
    return this.dbService.withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id FROM services WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!(rows as RowDataPacket[])[0]) {
        throw new NotFoundException(`Service ${id} not found`);
      }

      await conn.execute(
        'UPDATE services SET status = ? WHERE id = ?',
        [ServiceStatus.INACTIVE, id],
      );
      return { id };
    });
  }

  async addToBooking(bookingId: string, dto: AddBookingServiceDto) {
    // Pre-check nhanh trước transaction — fast-fail nếu booking không tồn tại
    const [bRows] = await this.db.execute(
      'SELECT id, status FROM bookings WHERE id = ?',
      [bookingId],
    );
    const booking = (bRows as RowDataPacket[])[0];
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);

    if (
      [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED].includes(
        booking.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot add service to a checked-out or cancelled booking',
      );
    }

    const id = uuidv4();

    // Sort ID để lock theo thứ tự nhất quán → tránh deadlock
    const ids = [
      { key: 'booking', id: bookingId },
      { key: 'service', id: dto.service_id },
    ].sort((a, b) => a.id.localeCompare(b.id));

    return this.dbService.withTransaction(async (conn) => {
      // Lock theo thứ tự đã sort
      for (const item of ids) {
        if (item.key === 'booking') {
          await conn.execute(
            'SELECT id FROM bookings WHERE id = ? FOR UPDATE',
            [bookingId],
          );
        } else {
          await conn.execute(
            'SELECT id FROM services WHERE id = ? FOR UPDATE',
            [dto.service_id],
          );
        }
      }

      // Đọc service SAU KHI lock — đảm bảo price/quantity là mới nhất
      const [sRows] = await conn.execute(
        'SELECT id, status, price, quantity FROM services WHERE id = ?',
        [dto.service_id],
      );
      const service = (sRows as RowDataPacket[])[0];
      if (!service) {
        throw new NotFoundException(`Service ${dto.service_id} not found`);
      }

      if (service.status === ServiceStatus.INACTIVE) {
        throw new BadRequestException('Service is not available');
      }

      if (service.quantity !== -1 && service.quantity < dto.quantity) {
        throw new BadRequestException('Not enough service quantity available');
      }

      await conn.execute(
        `INSERT INTO booking_services (id, booking_id, service_id, quantity, price, used_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, bookingId, dto.service_id, dto.quantity, service.price],
      );

      if (service.quantity !== -1) {
        await conn.execute(
          `UPDATE services
           SET quantity = GREATEST(quantity - ?, 0),
               status = CASE WHEN (quantity - ?) <= 0 THEN ? ELSE status END
           WHERE id = ?`,
          [dto.quantity, dto.quantity, ServiceStatus.INACTIVE, dto.service_id],
        );
      }

      // Cập nhật tổng tiền booking
      await conn.execute(
        `UPDATE bookings b
         SET b.total_service_price = (
               SELECT IFNULL(SUM(bs.price * bs.quantity), 0)
               FROM booking_services bs
               WHERE bs.booking_id = b.id
             ),
             b.grand_total = b.total_room_price + (
               SELECT IFNULL(SUM(bs.price * bs.quantity), 0)
               FROM booking_services bs
               WHERE bs.booking_id = b.id
             )
         WHERE b.id = ?`,
        [bookingId],
      );

      return { id };
    });
  }

  async getBookingServices(bookingId: string) {
    const [rows] = await this.db.execute(
      `SELECT bs.id, s.name, s.type, bs.quantity, bs.price, bs.used_at
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?`,
      [bookingId],
    );
    return rows as RowDataPacket[];
  }
}