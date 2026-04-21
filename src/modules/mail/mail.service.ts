import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  private formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  private getBaseTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #374151; margin: 0; padding: 0; }
          .wrapper { padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 40px 30px; text-align: center; border-bottom: 4px solid #fbbf24; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; }
          .content p { margin: 0 0 16px; font-size: 16px; line-height: 1.6; }
          .highlight { color: #1e293b; font-weight: 600; }
          .button-container { text-align: center; margin: 35px 0 20px; }
          .button { display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
          .info-table th { text-align: left; padding: 14px; background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 1px solid #e5e7eb; width: 45%; }
          .info-table td { padding: 14px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #111827; }
          .info-table tr:last-child th, .info-table tr:last-child td { border-bottom: none; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 13px; letter-spacing: 0.3px; }
          .badge.pending { background-color: #fef3c7; color: #d97706; }
          .badge.confirmed { background-color: #d1fae5; color: #059669; }
          .badge.cancelled { background-color: #fee2e2; color: #dc2626; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 0 0 8px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Elite Hotel & Resort. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingCreatedMail(email: string, fullName: string, shortId: string, checkInDate: Date, grandTotal: number) {
    const formattedDate = new Date(checkInDate).toLocaleDateString('vi-VN');
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p>Thank you for choosing to stay with us! Your booking request has been successfully created and is currently <span class="badge pending">Pending</span> confirmation.</p>
      <p>Please review your booking details below and kindly contact us or wait for our staff to confirm your reservation.</p>
      <table class="info-table">
        <tr><th>Booking Reference:</th><td><strong>${shortId}</strong></td></tr>
        <tr><th>Check-in Date:</th><td>${formattedDate}</td></tr>
        <tr><th>Total Amount:</th><td><span class="highlight">${grandTotal ? this.formatVND(Number(grandTotal)) : this.formatVND(0)}</span></td></tr>
      </table>
      <div class="button-container">
        <a href="#" class="button">View Your Booking</a>
      </div>
    `;
    const html = this.getBaseTemplate('Booking Created - Action Required', content);
    try {
      await this.mailerService.sendMail({ to: email, subject: `Action Required: Confirm Your Booking #${shortId}`, html });
      this.logger.log(`Sent booking creation email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
    }
  }

  async sendPendingReminderMail(email: string, fullName: string, shortId: string, checkInDate: Date) {
    const formattedDate = new Date(checkInDate).toLocaleDateString('vi-VN');
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p>This is a gentle reminder that your booking request <strong>${shortId}</strong> for <strong>${formattedDate}</strong> is still pending confirmation.</p>
      <p>Please note: If your booking remains unconfirmed for more than 3 days, it will be automatically <span class="badge cancelled">Cancelled</span>. We highly encourage you to confirm your reservation as soon as possible.</p>
      <div class="button-container">
        <a href="#" class="button">Confirm Now</a>
      </div>
    `;
    const html = this.getBaseTemplate('Booking Confirmation Reminder', content);
    try {
      await this.mailerService.sendMail({ to: email, subject: `Reminder: Please verify booking #${shortId}`, html });
      this.logger.log(`Sent pending reminder email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send pending reminder to ${email}: ${error.message}`);
    }
  }

  async sendBookingCancelledMail(email: string, fullName: string, shortId: string) {
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p>We regret to inform you that your booking <strong>${shortId}</strong> has been automatically <span class="badge cancelled">Cancelled</span> because it was not confirmed within the required 3-day timeframe.</p>
      <p>If you still wish to stay with us, you are more than welcome to make a new reservation on our platform.</p>
      <p>We hope to have the pleasure of welcoming you in the future.</p>
    `;
    const html = this.getBaseTemplate('Booking Cancelled', content);
    try {
      await this.mailerService.sendMail({ to: email, subject: `Booking Cancelled: #${shortId}`, html });
      this.logger.log(`Sent cancellation email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send cancel mail to ${email}: ${error.message}`);
    }
  }

  async sendBookingConfirmedMail(email: string, fullName: string, shortId: string, checkInDate: Date) {
    const formattedDate = new Date(checkInDate).toLocaleDateString('vi-VN');
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p>Great news! Your booking <strong>${shortId}</strong> has been successfully <span class="badge confirmed">Confirmed</span>.</p>
      <p>We are absolutely thrilled to accommodate you on <strong>${formattedDate}</strong>. If you need any assistance or special arrangements prior to your arrival, feel free to reply directly to this email.</p>
      <p>Safe travels, and we look forward to your wonderful stay with us.</p>
      <div class="button-container">
        <a href="#" class="button">View Trip Details</a>
      </div>
    `;
    const html = this.getBaseTemplate('Booking Confirmed!', content);
    try {
      await this.mailerService.sendMail({ to: email, subject: `Your Booking #${shortId} is Confirmed`, html });
      this.logger.log(`Sent confirmation email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send confirmed mail to ${email}: ${error.message}`);
    }
  }

  async sendBookingReminderMail(email: string, fullName: string, shortId: string, checkInDate: Date, isFinal: boolean) {
    const urgency = isFinal ? "Tomorrow is the day!" : "Your stay is fast approaching!";
    const formattedDate = new Date(checkInDate).toLocaleDateString('vi-VN');
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p><strong>${urgency}</strong></p>
      <p>This is a quick reminder for your upcoming stay associated with booking reference <strong>${shortId}</strong>.</p>
      <table class="info-table">
        <tr><th>Check-in Date:</th><td>${formattedDate}</td></tr>
      </table>
      <p>Our team is excitedly preparing for your arrival. Please let us know if you require any specific accommodations or airport transfers.</p>
    `;
    const headerTitle = isFinal ? 'Final Reminder: Check-in Tomorrow!' : 'Upcoming Stay Reminder';
    const html = this.getBaseTemplate(headerTitle, content);
    
    try {
      await this.mailerService.sendMail({ 
        to: email, 
        subject: isFinal ? `Final Reminder: Your stay tomorrow (#${shortId})` : `Reminder: Upcoming stay (#${shortId})`, 
        html 
      });
      this.logger.log(`Sent reminder email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send reminder to ${email}: ${error.message}`);
    }
  }

  async sendPaymentReceivedMail(email: string, fullName: string, shortId: string, amountPaid: number, totalPaid: number, grandTotal: number, isFullyPaid: boolean) {
    const statusText = isFullyPaid ? 'Fully Paid' : 'Partially Paid';
    const badgeClass = isFullyPaid ? 'confirmed' : 'pending';
    const content = `
      <p>Dear <span class="highlight">${fullName}</span>,</p>
      <p>We are delighted to inform you that we have successfully received your payment of <span class="badge confirmed" style="font-size:15px;background:#1e3a8a;">+${this.formatVND(amountPaid)}</span> for your booking reference <strong>${shortId}</strong>.</p>
      <table class="info-table">
        <tr><th>Total Booking Amount:</th><td>${this.formatVND(grandTotal)}</td></tr>
        <tr><th>Amount Paid So Far:</th><td>${this.formatVND(totalPaid)}</td></tr>
        <tr><th>Payment Status:</th><td><span class="badge ${badgeClass}">${statusText}</span></td></tr>
      </table>
      ${isFullyPaid
          ? `<p>Your booking is now fully paid. Thank you for your prompt payment! We look forward to welcoming you soon.</p>
             <div class="button-container">
               <a href="#" class="button" style="background-color: #059669;">View Receipt</a>
             </div>`
          : `<p>Please note that the remaining balance must be settled before or upon check-in. If you have any further questions, feel free to contact our support team.</p>`
      }
    `;
    const html = this.getBaseTemplate('Payment Received', content);
    try {
      await this.mailerService.sendMail({ to: email, subject: `Payment Received: Booking #${shortId}`, html });
      this.logger.log(`Sent payment success email to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send payment success to ${email}: ${error.message}`);
    }
  }
}
