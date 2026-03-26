import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise';
import { HashService } from 'src/modules/security/hash.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool,
    private readonly hashService: HashService
  ) {}

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

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      // Check if exists
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

  async remove(id: string) {
    const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return id;
  }
}
