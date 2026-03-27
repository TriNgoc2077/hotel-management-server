import { Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise';
import { HashService } from 'src/modules/security/hash.service';

@Injectable()
export class UsersService implements OnModuleInit {
  private blacklistedTokens = new Map<string, number>();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool,
    private readonly hashService: HashService
  ) {}

  async onModuleInit() {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>('SELECT token, expired_at FROM blacklisted_tokens WHERE expired_at > ?', [Date.now()]);
      for (const row of rows) {
        this.blacklistedTokens.set(row.token, Number(row.expired_at));
      }
    } catch (e) {
      Logger.error('Failed to load blacklisted tokens, perhaps migration not run:', e.message);
    }
    
    setInterval(() => this.cleanupBlacklistedTokens(), 1000 * 60 * 60); // every hour, clean up blacklisted tokens both in memory and in database
  }

  private cleanupBlacklistedTokens() {
    const now = Date.now();
    for (const [token, exp] of this.blacklistedTokens.entries()) {
      if (exp <= now) {
        this.blacklistedTokens.delete(token);
      }
    }
    this.pool.query('DELETE FROM blacklisted_tokens WHERE expired_at <= ?', [now]).catch(e => console.error('Cleanup DB error:', e.message));
  }

  async create(createUserDto: CreateUserDto) {
    const id = uuidv4();
    const passwordHash = await this.hashService.hashPassword(createUserDto.password);
    try {
      await this.pool.query(
        'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          createUserDto.roleId,
          createUserDto.fullName,
          createUserDto.email,
          passwordHash,
          createUserDto.phone || null,
          createUserDto.address || null,
          createUserDto.status,
        ]
      );
      
      return this.findOne(id);
    } catch (error) {
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async findAll() {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM v_users');
    return rows;
  }

  async findOne(id: string) {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM v_users WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return rows[0];
  }

  async findByEmail(email: string) {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM v_users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    
    return rows[0];
  } 

  async findByRefreshToken(refreshToken: string, agent: string) {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM tokens WHERE refresh_token = ? AND agent = ?', [refreshToken, agent]);
    
    if (rows.length === 0) {
      throw new NotFoundException(`User with refresh token ${refreshToken} not found or expired`);
    }
    
    return rows[0];
  } 
 
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      await this.findOne(id);
      
      await this.pool.query(
        'CALL sp_update_user(?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          updateUserDto.roleId || null,
          updateUserDto.fullName || null,
          updateUserDto.email || null,
          updateUserDto.phone || null,
          updateUserDto.address || null,
          updateUserDto.status || null,
        ]
      );
      
      return this.findOne(id);
    } catch (error) {
       if (error instanceof NotFoundException) {
         throw error;
       }
       throw new BadRequestException(`Failed to update user: ${error.message}`);
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string, expiredAt: Date, agent: string) {
    await this.pool.query(
      'CALL sp_update_refresh_token(?, ?, ?, ?)',
      [userId, refreshToken, expiredAt, agent]
    );
    return true;
  }

  async updateFcmToken(userId: string, fcmToken: string, agent: string) {
    await this.pool.query(
      'CALL sp_update_fcm_token(?, ?, ?)',
      [userId, fcmToken, agent]
    );
    return true;
  }

  async remove(id: string) {
    const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return id;
  }

  async removeToken(userId: string, agent: string) {
    await this.pool.query(
      'CALL sp_remove_token(?, ?)',
      [userId, agent]
    );
    return true;
  }

  async blacklistToken(token: string, expiredAt: number) {
    this.blacklistedTokens.set(token, expiredAt);
    try {
      await this.pool.query('CALL sp_blacklist_token(?, ?)', [token, expiredAt]);
    } catch (error) {
      console.error('Failed to save blacklisted token to DB', error.message);
    }
  }

  isTokenBlacklisted(token: string): boolean {
    const expiredAt = this.blacklistedTokens.get(token);
    if (!expiredAt) return false;
    
    if (expiredAt <= Date.now()) {
      this.blacklistedTokens.delete(token);
      return false;
    }
    return true;
  }
}
