import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import type { Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@/common/enums/role.enum';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('summary')
  getSummary(@Query() query: ReportQueryDto) {
    return this.reportsService.getSummary(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('rooms')
  getRoomStats(@Query() query: ReportQueryDto) {
    return this.reportsService.getRoomStats(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('revenue')
  getRevenueStats(@Query() query: ReportQueryDto) {
    return this.reportsService.getRevenueStats(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('customers')
  getCustomerStats(@Query() query: ReportQueryDto) {
    return this.reportsService.getCustomerStats(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('export')
  async exportCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const csv = await this.reportsService.exportCsv(query);
    res.header('Content-Type', 'text/csv');
    res.attachment(`report-${new Date().getTime()}.csv`);
    return res.send(csv);
  }
}
