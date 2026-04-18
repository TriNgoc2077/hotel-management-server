import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { BookingStatus } from '../bookings/dto/booking.dto';
import { DatabaseService } from '@/database/database.service';
import { toMysqlDatetime } from '@/common/helpers/datetime.helper';

@Injectable()
export class CheckinService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
  ) {}

  // getBooking dùng cho pre-check status trước transaction — không lock
  // Đây là fast-fail: nếu sai status → reject sớm, không vào transaction
  private async getBooking(id: string) {
    const [rows] = await this.db.execute(
      'SELECT * FROM v_bookings WHERE id = ?',
      [id],
    );
    const booking = (rows as RowDataPacket[])[0];
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async checkIn(bookingId: string) {
    const booking = await this.getBooking(bookingId);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in requires status Confirmed, current: ${booking.status}`,
      );
    }

    return this.dbService.withTransaction(async (conn) => {
      // Lock booking row trước khi update — tránh concurrent check-in
      const [rows] = await conn.execute(
        'SELECT id, status FROM bookings WHERE id = ? FOR UPDATE',
        [bookingId],
      );
      const current = (rows as RowDataPacket[])[0];

      // Re-check sau khi lock — status có thể đã thay đổi giữa getBooking và đây
      if (current.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(
          `Check-in requires status Confirmed, current: ${current.status}`,
        );
      }

      const now = toMysqlDatetime();
      await conn.execute('CALL sp_update_booking(?,?,?,?,?,?,?)', [
        bookingId,
        BookingStatus.CHECKED_IN,
        now,
        null,
        null,
        null,
        null,
      ]);

      return { id: bookingId };
    });
  }

  async checkOut(bookingId: string) {
    const booking = await this.getBooking(bookingId);

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Check-out requires status Checked-in, current: ${booking.status}`,
      );
    }

    return this.dbService.withTransactionIsolation(async (conn) => {
      // Fix: lock booking row TRƯỚC KHI tính giá
      // Ngăn addToBooking chen vào thêm service trong lúc đang checkout
      const [rows] = await conn.execute(
        'SELECT id, status FROM bookings WHERE id = ? FOR UPDATE',
        [bookingId],
      );
      const current = (rows as RowDataPacket[])[0];

      // Re-check sau khi lock
      if (current.status !== BookingStatus.CHECKED_IN) {
        throw new BadRequestException(
          `Check-out requires status Checked-in, current: ${current.status}`,
        );
      }

      // Tính giá SAU KHI đã lock — không bị race condition với addToBooking
      const [priceRows] = await conn.execute(
        `SELECT
           b.total_room_price,
           IFNULL(SUM(bs.price * bs.quantity), 0) AS total_service_price,
           b.total_room_price + IFNULL(SUM(bs.price * bs.quantity), 0) AS grand_total
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = ?
         GROUP BY b.id`,
        [bookingId],
      );
      const prices = (priceRows as RowDataPacket[])[0];

      const now = toMysqlDatetime();
      await conn.execute('CALL sp_update_booking(?,?,?,?,?,?,?)', [
        bookingId,
        BookingStatus.CHECKED_OUT,
        null,
        now,
        prices.total_room_price,
        prices.total_service_price,
        prices.grand_total,
      ]);

      return { id: bookingId };
    }, 'REPEATABLE READ');
  }
}
