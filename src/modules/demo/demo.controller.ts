import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Inject } from '@nestjs/common';
import { BookingStatus } from '../bookings/dto/booking.dto';
import { ServiceStatus } from '../services/dto/service.dto';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Controller('demo')
export class DemoController {
  constructor(@Inject('DATABASE_CONNECTION') private db: Pool) {}

  // ================================================================
  // 1. LOST UPDATE
  // ================================================================

  // ❌ LỖI: 2 request PATCH cùng lúc → update sau ghi đè update trước
  // Không có lock → lost update
  // Test: gửi 2 request song song cùng roomId
  @Patch('A_DEMO_LOST_UPDATE/:id')
  async demoLostUpdate(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    // Không transaction, không lock
    // Giả lập delay để tạo race condition dễ hơn
    const [before] = await this.db.execute(
      'SELECT id, status FROM rooms WHERE id = ?',
      [id],
    );
    const roomBefore = (before as RowDataPacket[])[0];

    await delay(3000); // delay 3s → request thứ 2 có thể chen vào

    await this.db.execute('UPDATE rooms SET status = ? WHERE id = ?', [
      body.status,
      id,
    ]);

    const [after] = await this.db.execute(
      'SELECT id, status FROM rooms WHERE id = ?',
      [id],
    );
    const roomAfter = (after as RowDataPacket[])[0];

    return {
      note: 'DEMO LOST UPDATE - không có lock, update sau ghi đè update trước',
      before: roomBefore,
      after: roomAfter,
    };
  }

  // ✅ FIX: SELECT FOR UPDATE → lock row trước khi update
  @Patch('B_FIX_LOST_UPDATE/:id')
  async fixLostUpdate(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // Lock row → request khác phải chờ transaction này commit
      const [before] = await conn.execute(
        'SELECT id, status FROM rooms WHERE id = ? FOR UPDATE',
        [id],
      );
      const roomBefore = (before as RowDataPacket[])[0];

      await delay(3000); // delay vẫn giữ nhưng request thứ 2 phải xếp hàng

      await conn.execute('UPDATE rooms SET status = ? WHERE id = ?', [
        body.status,
        id,
      ]);

      await conn.commit();

      const [after] = await this.db.execute(
        'SELECT id, status FROM rooms WHERE id = ?',
        [id],
      );
      const roomAfter = (after as RowDataPacket[])[0];

      return {
        note: 'FIX LOST UPDATE - SELECT FOR UPDATE, request thứ 2 phải chờ',
        before: roomBefore,
        after: roomAfter,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ================================================================
  // 2. DIRTY READ
  // ================================================================

  // ❌ LỖI: READ UNCOMMITTED → đọc được data của transaction chưa commit
  // Test flow:
  //   1. Gọi A_DEMO_DIRTY_READ_WRITER (tạo booking, delay 10s, rollback)
  //   2. Trong lúc delay → gọi A_DEMO_DIRTY_READ_READER với bookingId vừa tạo
  //   3. Reader đọc được booking dù writer chưa commit (dirty read)
  @Post('A_DEMO_DIRTY_READ_WRITER')
  async demoDirtyReadWriter(@Body() body: { customer_id: string }) {
    const bookingId = uuidv4();
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED',
      );
      await conn.beginTransaction();

      // Insert booking tạm
      await conn.execute(
        `INSERT INTO bookings (id, short_id, customer_id, check_in_date, check_out_date, status, grand_total, total_room_price, total_service_price)
         VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'Pending', 0, 0, 0)`,
        [bookingId, bookingId.slice(0, 8).toUpperCase(), body.customer_id],
      );

      // Delay 10s → trong thời gian này Reader có thể đọc dirty data
      await delay(10000);

      // Rollback → booking không tồn tại thật
      await conn.rollback();

      return {
        note: 'WRITER đã rollback - booking này không tồn tại thật',
        bookingId,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ❌ LỖI: READ UNCOMMITTED → đọc được booking chưa commit
  @Get('A_DEMO_DIRTY_READ_READER')
  async demoDirtyReadReader(@Query('booking_id') bookingId: string) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED',
      );
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT * FROM bookings WHERE id = ?',
        [bookingId],
      );
      const booking = (rows as RowDataPacket[])[0];

      await conn.commit();

      return {
        note: 'DEMO DIRTY READ - READ UNCOMMITTED, có thể đọc data chưa commit',
        found: !!booking,
        booking: booking ?? null,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ FIX: READ COMMITTED → chỉ đọc data đã commit
  @Get('B_FIX_DIRTY_READ_READER')
  async fixDirtyReadReader(@Query('booking_id') bookingId: string) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
      );
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT * FROM bookings WHERE id = ?',
        [bookingId],
      );
      const booking = (rows as RowDataPacket[])[0];

      await conn.commit();

      return {
        note: 'FIX DIRTY READ - READ COMMITTED, chỉ thấy data đã commit',
        found: !!booking,
        booking: booking ?? null,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ================================================================
  // 3. NON-REPEATABLE READ
  // ================================================================

  // ❌ LỖI: READ COMMITTED → 2 lần đọc trong cùng transaction có thể khác nhau
  // Test flow:
  //   1. Gọi A_DEMO_NON_REPEATABLE_READ với bookingId
  //   2. Trong lúc delay 5s → dùng endpoint khác UPDATE grand_total của booking đó
  //   3. Lần đọc 2 sẽ khác lần đọc 1
  @Patch('A_DEMO_NON_REPEATABLE_READ/:id')
  async demoNonRepeatableRead(@Param('id') id: string) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
      );
      await conn.beginTransaction();

      // SELECT lần 1
      const [rows1] = await conn.execute(
        `SELECT b.total_room_price,
                IFNULL(SUM(bs.price * bs.quantity), 0) AS total_service_price,
                b.grand_total
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id],
      );
      const read1 = (rows1 as RowDataPacket[])[0];

      // Delay 5s → trong thời gian này transaction khác có thể UPDATE
      await delay(5000);

      // SELECT lần 2 - với READ COMMITTED có thể khác lần 1
      const [rows2] = await conn.execute(
        `SELECT b.total_room_price,
                IFNULL(SUM(bs.price * bs.quantity), 0) AS total_service_price,
                b.grand_total
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id],
      );
      const read2 = (rows2 as RowDataPacket[])[0];

      await conn.commit();

      return {
        note: 'DEMO NON-REPEATABLE READ - READ COMMITTED, 2 lần đọc có thể khác nhau',
        isConsistent: JSON.stringify(read1) === JSON.stringify(read2),
        read1,
        read2,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ FIX: REPEATABLE READ → 2 lần đọc luôn giống nhau trong cùng transaction
  @Patch('B_FIX_NON_REPEATABLE_READ/:id')
  async fixNonRepeatableRead(@Param('id') id: string) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
      );
      await conn.beginTransaction();

      // SELECT lần 1
      const [rows1] = await conn.execute(
        `SELECT b.total_room_price,
                IFNULL(SUM(bs.price * bs.quantity), 0) AS total_service_price,
                b.grand_total
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id],
      );
      const read1 = (rows1 as RowDataPacket[])[0];

      // Delay 5s → transaction khác UPDATE nhưng ta không thấy
      await delay(5000);

      // SELECT lần 2 - với REPEATABLE READ luôn giống lần 1
      const [rows2] = await conn.execute(
        `SELECT b.total_room_price,
                IFNULL(SUM(bs.price * bs.quantity), 0) AS total_service_price,
                b.grand_total
         FROM bookings b
         LEFT JOIN booking_services bs ON bs.booking_id = b.id
         WHERE b.id = ?
         GROUP BY b.id`,
        [id],
      );
      const read2 = (rows2 as RowDataPacket[])[0];

      await conn.commit();

      return {
        note: 'FIX NON-REPEATABLE READ - REPEATABLE READ, 2 lần đọc luôn giống nhau',
        isConsistent: JSON.stringify(read1) === JSON.stringify(read2),
        read1,
        read2,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ================================================================
  // 4. PHANTOM READ
  // ================================================================

  // ❌ LỖI: REPEATABLE READ → có thể thấy row mới xuất hiện giữa 2 lần đọc
  // Test flow:
  //   1. Gọi A_DEMO_PHANTOM_READ với params
  //   2. Trong lúc delay 5s → tạo booking mới chiếm 1 phòng trong khoảng đó
  //   3. Lần đọc 2 sẽ trả về ít phòng hơn lần đọc 1 (phantom)
  @Get('A_DEMO_PHANTOM_READ')
  async demoPhantomRead(
    @Query('room_type_id') roomTypeId: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
  ) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
      );
      await conn.beginTransaction();

      // SELECT lần 1
      const [rows1] = await conn.execute(
        'CALL sp_find_available_room_types(?,?,?)',
        [roomTypeId, checkIn, checkOut],
      );
      const read1 = (rows1 as RowDataPacket[][])[0] ?? [];

      // Delay 5s → transaction khác INSERT booking mới
      await delay(5000);

      // SELECT lần 2 - với REPEATABLE READ + CALL SP vẫn có thể bị phantom
      // vì SP dùng subquery động, không phải snapshot của rows đã đọc
      const [rows2] = await conn.execute(
        'CALL sp_find_available_room_types(?,?,?)',
        [roomTypeId, checkIn, checkOut],
      );
      const read2 = (rows2 as RowDataPacket[][])[0] ?? [];

      await conn.commit();

      return {
        note: 'DEMO PHANTOM READ - REPEATABLE READ, số phòng trống có thể thay đổi giữa 2 lần đọc',
        read1Count: read1.length,
        read2Count: read2.length,
        isPhantom: read1.length !== read2.length,
        read1,
        read2,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ FIX: SERIALIZABLE → không có phantom, mọi transaction phải xếp hàng
  @Get('B_FIX_PHANTOM_READ')
  async fixPhantomRead(
    @Query('room_type_id') roomTypeId: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
  ) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.execute(
        'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
      );
      await conn.beginTransaction();

      // SELECT lần 1
      const [rows1] = await conn.execute(
        'CALL sp_find_available_room_types(?,?,?)',
        [roomTypeId, checkIn, checkOut],
      );
      const read1 = (rows1 as RowDataPacket[][])[0] ?? [];

      // Delay 5s → transaction khác muốn INSERT phải chờ transaction này xong
      await delay(5000);

      // SELECT lần 2 - SERIALIZABLE đảm bảo không có phantom
      const [rows2] = await conn.execute(
        'CALL sp_find_available_room_types(?,?,?)',
        [roomTypeId, checkIn, checkOut],
      );
      const read2 = (rows2 as RowDataPacket[][])[0] ?? [];

      await conn.commit();

      return {
        note: 'FIX PHANTOM READ - SERIALIZABLE, 2 lần đọc luôn giống nhau',
        read1Count: read1.length,
        read2Count: read2.length,
        isConsistent: read1.length === read2.length,
        read1,
        read2,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ================================================================
  // 5. DEADLOCK
  // ================================================================

  // ❌ LỖI: 2 transaction lock ngược thứ tự → deadlock
  // Test flow:
  //   1. Gọi A_DEMO_DEADLOCK với bookingId=X, serviceId=Y
  //   2. Gọi A_DEMO_DEADLOCK với bookingId=Y, serviceId=X (đảo ngược)
  //   3. MySQL sẽ detect deadlock và kill 1 trong 2
  @Post('A_DEMO_DEADLOCK')
  async demoDeadlock(
    @Body() body: { booking_id: string; service_id: string },
  ) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // Lock booking trước
      await conn.execute(
        'SELECT id FROM bookings WHERE id = ? FOR UPDATE',
        [body.booking_id],
      );

      // Delay → request thứ 2 lock service trước, rồi cố lock booking
      // → deadlock hình thành
      await delay(5000);

      // Lock service sau
      await conn.execute(
        'SELECT id FROM services WHERE id = ? FOR UPDATE',
        [body.service_id],
      );

      await conn.commit();

      return {
        note: 'DEMO DEADLOCK - lock booking → delay → lock service (ngược với request kia)',
        booking_id: body.booking_id,
        service_id: body.service_id,
      };
    } catch (err) {
      await conn.rollback();
      // MySQL error 1213 = deadlock
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ FIX: lock theo thứ tự ID tăng dần → không bao giờ deadlock
  @Post('B_FIX_DEADLOCK')
  async fixDeadlock(
    @Body() body: { booking_id: string; service_id: string },
  ) {
    const conn: PoolConnection = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // Sort ID → luôn lock theo thứ tự nhất quán
      const lockOrder = [body.booking_id, body.service_id].sort();

      for (const id of lockOrder) {
        if (id === body.booking_id) {
          await conn.execute(
            'SELECT id FROM bookings WHERE id = ? FOR UPDATE',
            [body.booking_id],
          );
        } else {
          await conn.execute(
            'SELECT id FROM services WHERE id = ? FOR UPDATE',
            [body.service_id],
          );
        }
      }

      await delay(5000);

      await conn.commit();

      return {
        note: 'FIX DEADLOCK - lock theo thứ tự ID sort tăng dần, không bao giờ deadlock',
        lockOrder,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
