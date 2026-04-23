import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  QueryRoomTypeDto,
} from './dto/room-type.dto';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/customize';
import { Public } from '@/common/decorators/public.decorator';

@Controller('room-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Public()
  @ResponseMessage('Fetch room types successfully')
  @Get()
  findAll(@Query() query: QueryRoomTypeDto) {
    return this.roomTypesService.findAll(query);
  }

  @Public()
  @ResponseMessage('Fetch room type successfully')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomTypesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Room type created successfully')
  @Post()
  create(@Body() dto: CreateRoomTypeDto) {
    return this.roomTypesService.create(dto);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Room type updated successfully')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.roomTypesService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Room type deleted successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomTypesService.remove(id);
  }
}
