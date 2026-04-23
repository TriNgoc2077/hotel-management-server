// bookings.service.ts
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { toMysqlDatetime } from '@/common/helpers/datetime.helper';
import { ApplyCouponDto, CreateCouponDto } from './dto/coupon.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Pool,
    private readonly dbService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async findMyBookings(userId: string) {
    const [rows] = await this.db.query<RowDataPacket[][]>('SELECT * FROM v_bookings WHERE customerId = ?', [userId]);
    return rows[0];
  }

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
    if (query.customerId) {
      countSql += ' AND customerId = ?';
      countParams.push(query.customerId);
    }
    if (query.checkInDate) {
      countSql += ' AND checkInDate >= ?';
      countParams.push(query.checkInDate);
    }
    if (query.checkOutDate) {
      countSql += ' AND checkOutDate <= ?';
      countParams.push(query.checkOutDate);
    }

    const [countRows] = await this.db.query(countSql, countParams);
    const totalItems = (countRows as RowDataPacket[])[0]?.totalItems ?? 0;

    if (totalItems > 0 && offset >= totalItems) {
      return {
        meta: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
        result: [],
      };
    }

    // BUG FIX: build params độc lập, KHÔNG copy từ countParams
    const params: any[] = [];
    let sql = 'SELECT * FROM v_bookings WHERE 1=1';

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }
    if (query.customerId) {
      sql += ' AND customerId = ?';
      params.push(query.customerId);
    }
    if (query.checkInDate) {
      sql += ' AND checkInDate >= ?';
      params.push(query.checkInDate);
    }
    if (query.checkOutDate) {
      sql += ' AND checkOutDate <= ?';
      params.push(query.checkOutDate);
    }

    // BUG FIX: đổi created_at → createdAt (alias trong v_bookings)
    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.db.query(sql, params);

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
    capacity: number = 1,
    page: number = 1,
    limit: number = 10,
    ) {
    if (!checkIn || !checkOut) {
        throw new BadRequestException('check_in, check_out are required');
    }

    const offset = (page - 1) * limit;

    const [rows] = await this.db.execute(
        'CALL sp_find_available_room_types(?,?,?,?,?,?)',
        [roomTypeId ?? null, checkIn, checkOut, capacity, offset, limit],
    );
    return (rows as RowDataPacket[][])[0] ?? [];
    }

  async create(dto: CreateBookingDto) {
    const id = uuidv4();
    const shortId = id.slice(id.length - 6).toUpperCase();

    const services =
      dto.services && dto.services.length > 0
        ? dto.services.map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
          }))
        : null;

    await this.db.execute('CALL sp_create_booking(?,?,?,?,?,?,?,?,?,?)', [
      id,
      shortId,
      dto.customerId,
      dto.staffId ?? null,
      dto.checkInDate,
      dto.checkOutDate,
      dto.roomTypeId,
      JSON.stringify(dto.roomIds),
      services ? JSON.stringify(services) : null,
      dto.discount ?? 0,
    ]);

    const newBooking = await this.findOne(id);
    // Async email sending
    this.db.query<RowDataPacket[]>('SELECT email, full_name FROM users WHERE id = ?', [dto.customerId])
      .then(([users]) => {
        if (users.length > 0) {
          const user = users[0];
          this.mailService.sendBookingCreatedMail(user.email, user.full_name, shortId, new Date(dto.checkInDate), (newBooking as any).grand_total || (newBooking as any).grantTotal);
        }
      })
      .catch(err => this.logger.error('Failed to fetch user for email sending', err));
    

    return { id };
  }

  
  async confirmBooking(id: string) {
    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      const [bookings] = await connection.query<RowDataPacket[]>('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [id]);
      if (bookings.length === 0) throw new NotFoundException('Booking not found');
      
      const booking = bookings[0];
      if (booking.status !== 'Pending') {
        throw new BadRequestException('Only Pending bookings can be confirmed');
      }

      await connection.query('UPDATE bookings SET status = ? WHERE id = ?', ['Confirmed', id]);
      await connection.commit();
      
      const confirmedBooking = await this.findOne(id);
      
      // Async email sending
      this.db.query<RowDataPacket[]>('SELECT email, full_name FROM users WHERE id = ?', [booking.customer_id])
        .then(([users]) => {
          if (users.length > 0) {
            const user = users[0];
            this.mailService.sendBookingConfirmedMail(user.email, user.full_name, booking.short_id, new Date(booking.check_in_date));
          }
        })
        .catch(err => this.logger.error('Failed to fetch user for confirm email', err));

      return confirmedBooking;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
        dto.actualCheckIn ?? null,
        dto.actualCheckOut ?? null,
        dto.totalRoomPrice ?? null,
        dto.totalServicePrice ?? null,
        dto.grandTotal ?? null,
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

  async getPaymentQr(amount: number, description: string) {
    const BANK_ID = 'mbbank';
    const ACCOUNT_NO = 'VQRQAIBOC1226';
    const TEMPLATE = 'compact2';
    const AMOUNT = amount;
    const DESCRIPTION = description;
    const ACCOUNT_NAME = 'CAO NGUYEN TRI NGOC';

    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${AMOUNT}&addInfo=${encodeURIComponent(DESCRIPTION)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
    
    return qrUrl;
  }

  async createCoupon(createCouponDto: CreateCouponDto) {
    const [existCp] = await this.db.query<RowDataPacket[][]>('SELECT * FROM coupons WHERE code = ? AND coupon_status = ?', [createCouponDto.code, 'Active']);
    if (existCp[0]) throw new BadRequestException('Coupon already exists');
    const { code, discountType, discountValue, expiredAt } = createCouponDto;
    const couponId = uuidv4();
    let expiredAtDate = expiredAt ? new Date(expiredAt) : new Date(Date.now() + 2 * 7 * 24 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO coupons (id, code, discount_type, discount_value, expired_at) VALUES (?, ?, ?, ?, ?)',
      [couponId, code, discountType, discountValue, expiredAtDate]
    );
    return this.findOneCoupon(couponId);
  }

  async findAllCoupon() {
    const [rows] = await this.db.query<RowDataPacket[][]>('SELECT * FROM coupons');
    return rows[0];
  }

  async findOneCoupon(id: string) {
    const [rows] = await this.db.query<RowDataPacket[][]>('SELECT * FROM coupons WHERE id = ? AND coupon_status = ?', [id, 'Active']);
    return rows[0];
  }

  async applyCoupon(applyCouponDto: ApplyCouponDto) {
    const { bookingId, couponCode } = applyCouponDto;
    
    const [booking] = await this.db.query<RowDataPacket[]>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (booking.length === 0) throw new NotFoundException('Booking not found'); 
    // if (booking[0].status !== 'Pending') throw new BadRequestException('Booking is not in Pending status');
    
    const [coupon] = await this.db.query<RowDataPacket[]>('SELECT * FROM view_coupons WHERE code = ?', [couponCode]);
    if (coupon.length === 0) throw new NotFoundException('Coupon not found');
    
    const discountAmount = coupon[0].discountType === 'Percentage' ? booking[0].grantTotal * coupon[0].discountValue / 100 : coupon[0].discountValue;
    const [rows] = await this.db.query<RowDataPacket[][]>('CALL sp_use_coupon(?,?,?)', [bookingId, couponCode, discountAmount]);
    return rows[0];
  }

  async deleteCoupon(id: string) {
    const [rows] = await this.db.query<RowDataPacket[][]>('UPDATE coupons SET coupon_status = "Inactive", expired_at = NOW() WHERE id = ?', [id]);
    return rows[0];
  }
}