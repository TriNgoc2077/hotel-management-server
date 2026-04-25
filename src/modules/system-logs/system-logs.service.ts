import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { INSERT_SYSTEM_LOG } from './query';
import { PaginatedResponseDto } from 'src/common/dto/response.dto';
import { SystemLogDto } from './dto/system-log.dto';
import { CreateSystemLogDto } from './dto/create-system-log.dto';

@Injectable()
export class SystemLogsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly pool: Pool,
  ) {}

  async findAll(query: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
  }): Promise<PaginatedResponseDto<SystemLogDto>> {
    try {
      const { page, limit, userId, action } = query;

      let sql = `SELECT * FROM system_logs WHERE 1=1`;
      let countSql = `SELECT COUNT(*) as total FROM system_logs WHERE 1=1`;
      const params: any[] = [];

      if (userId) {
        sql += ` AND user_id = ?`;
        countSql += ` AND user_id = ?`;
        params.push(userId);
      }

      if (action) {
        sql += ` AND action LIKE ?`;
        countSql += ` AND action LIKE ?`;
        params.push(`%${action}%`);
      }

      // Get total count
      const [countResult] = await this.pool.query<RowDataPacket[]>(countSql, params);
      const totalItems = countResult[0]?.total || 0;

      // Get paginated data
      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const dataParams = [...params, limit, (page - 1) * limit];

      const [data] = await this.pool.query<SystemLogDto[] & RowDataPacket[]>(sql, dataParams);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        result: data,
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get system logs: ${error.message}`);
    }
  }

  async create(data: CreateSystemLogDto) {
    // console.log("CREATE LOG")
    try {
      const { userId, action, ip, userAgent, description } = data;
      const id = uuidv4();
      await this.pool.query(INSERT_SYSTEM_LOG, [
        id,
        userId || null,
        action,
        ip || null,
        userAgent || null,
        description || null,
      ]);
    } catch (error) {
      console.error('Failed to create system log:', error);
      throw new InternalServerErrorException(`Failed to create system log: ${error.message}`);
    }
  }
}
