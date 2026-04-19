import { Injectable, Inject } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool,
  ) {}

  async getRoomStats(query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const [bookingStats] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(id) as totalBookings,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
        SUM(CASE WHEN status = 'Checked-out' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN status = 'Checked-in' THEN 1 ELSE 0 END) as activeBookings
      FROM bookings 
      WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [roomTypeStats] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        rt.name as roomTypeName,
        COUNT(br.id) as totalBooked
      FROM booking_rooms br
      JOIN rooms r ON br.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN bookings b ON br.booking_id = b.id
      WHERE b.created_at BETWEEN ? AND ?
      GROUP BY rt.id`,
      [startDate, endDate]
    );

    return {
      summary: bookingStats[0],
      byRoomType: roomTypeStats,
    };
  }

  async getRevenueStats(query: ReportQueryDto) {
    const { startDate, endDate, type } = this.getDateRange(query);

    let groupBy = 'DATE(created_at)';
    if (type === ReportType.MONTH) {
      groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
    } else if (type === ReportType.YEAR) {
      groupBy = 'YEAR(created_at)';
    }

    const [revenueTimeline] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        ${groupBy} as period,
        SUM(grand_total) as totalRevenue,
        SUM(total_room_price) as roomRevenue,
        SUM(total_service_price) as serviceRevenue,
        SUM(discount) as totalDiscount
      FROM bookings
      WHERE status NOT IN ('Cancelled', 'Pending')
        AND created_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period ASC`,
      [startDate, endDate]
    );

    const [totalStats] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        SUM(grand_total) as totalRevenue,
        SUM(total_room_price) as roomRevenue,
        SUM(total_service_price) as serviceRevenue,
        COUNT(id) as totalInvoices
      FROM bookings
      WHERE status NOT IN ('Cancelled', 'Pending')
        AND created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    return {
      summary: totalStats[0],
      timeline: revenueTimeline,
    };
  }

  async getCustomerStats(query: ReportQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const [customerStats] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT customer_id) as activeCustomers
      FROM bookings
      WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [newCustomers] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Customer' 
         AND u.created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [topCustomers] = await this.pool.query<RowDataPacket[]>(
      `SELECT 
        u.full_name as name,
        u.email,
        COUNT(b.id) as totalBookings,
        SUM(b.grand_total) as totalSpent
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      WHERE b.status = 'Checked-out'
        AND b.created_at BETWEEN ? AND ?
      GROUP BY u.id
      ORDER BY totalSpent DESC
      LIMIT 10`,
      [startDate, endDate]
    );

    return {
      activeCustomers: customerStats[0].activeCustomers,
      newCustomers: newCustomers[0].count,
      topCustomers: topCustomers,
    };
  }

  async getSummary(query: ReportQueryDto) {
    const roomStats = await this.getRoomStats(query);
    const revenueStats = await this.getRevenueStats(query);
    const customerStats = await this.getCustomerStats(query);

    return {
      rooms: roomStats.summary,
      revenue: revenueStats.summary,
      customers: {
        active: customerStats.activeCustomers,
        new: customerStats.newCustomers
      }
    };
  }

  async exportCsv(query: ReportQueryDto) {
    const revenue = await this.getRevenueStats(query);
    
    let csv = 'Period,Total Revenue,Room Revenue,Service Revenue,Discount\n';
    revenue.timeline.forEach((row: any) => {
      csv += `${row.period},${row.totalRevenue},${row.roomRevenue},${row.serviceRevenue},${row.totalDiscount}\n`;
    });

    return csv;
  }

  private getDateRange(query: ReportQueryDto) {
    let start = query.startDate ? new Date(query.startDate) : new Date();
    if (!query.startDate) {
      start.setMonth(start.getMonth() - 1); // Default to last 30 days
    }
    
    let end = query.endDate ? new Date(query.endDate) : new Date();
    if (!query.endDate) {
      end.setHours(23, 59, 59, 999);
    }

    return {
      startDate: start,
      endDate: end,
      type: query.type || ReportType.DAY,
    };
  }
}
