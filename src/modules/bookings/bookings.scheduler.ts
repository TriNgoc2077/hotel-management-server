import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handlePendingBookings() {
    try {
      const [bookings] = await this.pool.query<RowDataPacket[]>(`
        SELECT b.id, b.short_id, b.created_at, b.check_in_date, u.email, u.full_name
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        WHERE b.status = ?
      `, ['Pending']);

      const now = new Date();
      for (const booking of bookings) {
        const createdAt = new Date(booking.created_at);
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > 3) {
          // Cancel booking
          await this.pool.query('UPDATE bookings SET status = ? WHERE id = ?', ['Cancelled', booking.id]);
          this.logger.log(`Cancelled booking ${booking.short_id} (pending > 3 days)`);
          this.mailService.sendBookingCancelledMail(booking.email, booking.full_name, booking.short_id);
        } else {
          // Send reminder
          this.mailService.sendPendingReminderMail(booking.email, booking.full_name, booking.short_id, booking.check_in_date);
        }
      }
    } catch (error: any) {
      this.logger.error('Error in handlePendingBookings: ' + error.message);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleCheckingReminders() {
    try {
      const [bookings] = await this.pool.query<RowDataPacket[]>(`
        SELECT b.id, b.short_id, b.check_in_date, u.email, u.full_name
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        WHERE b.status = ?
      `, ['Confirmed']);

      const now = new Date();
      // Only care about the date part for day diff mapping
      now.setHours(0,0,0,0);
      
      for (const booking of bookings) {
        const checkInDate = new Date(booking.check_in_date);
        checkInDate.setHours(0,0,0,0);
        
        const diffMs = checkInDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          this.mailService.sendBookingReminderMail(booking.email, booking.full_name, booking.short_id, checkInDate, true);
        } else if (diffDays > 0 && diffDays % 7 === 0) {
          this.mailService.sendBookingReminderMail(booking.email, booking.full_name, booking.short_id, checkInDate, false);
        }
      }
    } catch (error: any) {
      this.logger.error('Error in handleCheckingReminders: ' + error.message);
    }
  }
}
