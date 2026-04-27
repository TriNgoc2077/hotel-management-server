import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { SePayPayload } from './dto/sepay.payload.dto';
import { MailService } from '../mail/mail.service';
import { generateInvoiceNumber } from '@/utility/generation.invoice-number';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool,
    private readonly mailService: MailService,
  ) {}

  async processSePayTransaction(payload: SePayPayload) {
    this.logger.log(`Received SePay transaction: ${payload.id}`);
    
    if (!payload.content || !payload.transferAmount) {
      throw new BadRequestException('Invalid payload');
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if this transaction ID already exists in our payments to ensure idempotency
      const [existingPayments] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM payments WHERE transaction_id = ?',
        [payload.id.toString()]
      );

      if (existingPayments.length > 0) {
        this.logger.log(`Transaction ${payload.id} already processed`);
        await connection.rollback();
        return;
      }
      console.log(payload)
      const shortId = payload.content.slice(payload.content.length - 6).toUpperCase();
      const [bookings] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM bookings WHERE short_id = ? FOR UPDATE',
        [shortId]
      );

      if (!bookings[0]) {
        this.logger.warn(`Booking not found for short_id: ${shortId}`);
        await connection.rollback();
        return;
      }

      const booking = bookings[0];
      const paymentId = uuidv4();
      
      await connection.query(
        `INSERT INTO payments (id, booking_id, amount, payment_method, payment_status, transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [paymentId, booking.id, payload.transferAmount, 'Bank Transfer', 'Completed', payload.id.toString()]
      );
      
      // Update deposit = deposit + new amount
      await connection.query('UPDATE bookings SET deposit = deposit + ? WHERE id = ?', [payload.transferAmount, booking.id]);
      this.logger.log(`Booking ${shortId} deposit increased by ${payload.transferAmount}`);

      await connection.commit();
      this.logger.log(`Successfully processed transaction ${payload.id} for booking ${shortId}`);
      let [newBk] = await this.pool.query<RowDataPacket[]>('SELECT * FROM v_bookings WHERE id = ?', [booking.id]);
      const isFullyPaid = newBk[0].deposit + newBk[0].discount >= newBk[0].grandTotal;
      if (isFullyPaid) {
        await this.pool.query(
          `UPDATE bookings SET status = 'Paid' WHERE id = ?`,
          [booking.id]
        );
        const [updatedBk] = await this.pool.query<RowDataPacket[]>('SELECT * FROM v_bookings WHERE id = ?', [booking.id]);
        newBk = updatedBk;
        await this.createInvoice(booking.id);
      }

      // Notify customer
      this.pool.query<RowDataPacket[]>('SELECT email, full_name FROM users WHERE id = ?', [booking.customer_id])
        .then(([users]) => {
          this.logger.log(`Sending payment received email to ${users[0].email}`);
          if (users.length > 0) {
             const user = users[0];
             this.mailService.sendPaymentReceivedMail(
               user.email, 
               user.full_name, 
               shortId, 
               payload.transferAmount, 
               newBk[0].deposit, 
               newBk[0].grandTotal, 
               isFullyPaid
             );
          }
        }).catch(err => this.logger.error('Failed to send payment email', err.message));

      return newBk;
    } catch (error: any) {
      await connection.rollback();
      this.logger.error(`Error processing SePay transaction: ${error.message}`, error.stack);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createInvoice(bookingId: string) {
    const connection = await this.pool.getConnection();
    try {

      const [bookings] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM v_bookings WHERE id = ?',
        [bookingId]
      );

      if (bookings.length === 0) {
        this.logger.warn(`Booking not found for id: ${bookingId}`);
        return;
      }

      const booking = bookings[0];
      const invoiceId = uuidv4();
      let invoiceNumber = generateInvoiceNumber();
      while (true) {
        const [existingInvoice] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM invoices WHERE invoice_number = ?',
          [invoiceNumber]
        );
        if (existingInvoice[0].length > 0) {
          this.logger.warn(`Invoice already exists for invoice number: ${invoiceNumber}`);
          invoiceNumber = generateInvoiceNumber();
        } else {
          break;
        }
      }
      await connection.query(
        `INSERT INTO invoices (id, booking_id, invoice_number, total_amount, issued_date)
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, booking.id, invoiceNumber, booking.grandTotal, new Date()]
      );
      
    } catch (error: any) {
      this.logger.error(`Error processing create invoice: ${error.message}`, error.stack);
      throw error;
    }
  }
}
