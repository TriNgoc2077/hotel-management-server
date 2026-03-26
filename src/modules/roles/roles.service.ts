import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise';

@Injectable()
export class RolesService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly pool: Pool
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const id = uuidv4();
    try {
      await this.pool.query(
        'INSERT INTO roles (id, name) VALUES (?, ?)',
        [id, createRoleDto.name]
      );
      return this.findOne(id);
    } catch (error) {
      throw new BadRequestException(`Failed to create role: ${error.message}`);
    }
  }

  async findAll() {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM roles');
    return rows;
  }

  async findOne(id: string) {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM roles WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    
    return rows[0];
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    try {
      if (!updateRoleDto.name) {
        return this.findOne(id);
      }

      await this.findOne(id);
      
      await this.pool.query(
        'UPDATE roles SET name = ? WHERE id = ?',
        [updateRoleDto.name, id]
      );
      
      return this.findOne(id);
    } catch (error) {
       if (error instanceof NotFoundException) {
         throw error;
       }
       throw new BadRequestException(`Failed to update role: ${error.message}`);
    }
  }

  async remove(id: string) {
    const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM roles WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    
    return id;
  }
}
