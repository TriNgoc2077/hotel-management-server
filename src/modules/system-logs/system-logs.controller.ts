import {
  Controller,
  Query,
  Get,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { SystemLogsService } from './system-logs.service';
import { GetLogsQueryDto } from './dto/get-logs-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/response.dto';
import { SystemLogDto } from './dto/system-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';

@Controller('admin/logs')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class SystemLogsController {
  constructor(private readonly logsService: SystemLogsService) {}

  @Get()
  // @Roles(Role.ADMIN)
  async getLogs(
    @Query() query: GetLogsQueryDto,
  ): Promise<PaginatedResponseDto<SystemLogDto>> {
    try {
      return await this.logsService.findAll({
        page: Number(query.page),
        limit: Number(query.limit),
        userId: query.userId,
        action: query.action,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
