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
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, QueryRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/customize';
import { Public } from '@/common/decorators/public.decorator';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}


  @Public()
  @ResponseMessage('Fetch rooms successfully')
  @Get('public')
  findAllPublic(@Query() query: QueryRoomDto) {
    return this.roomsService.findAll(query, 1);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Fetch rooms successfully')
  @Get()
  findAll(@Query() query: QueryRoomDto, @Query('isPublic') isPublic: number = 1) {
    return this.roomsService.findAll(query, +isPublic);
  }

  @Public()
  @ResponseMessage('Fetch room successfully')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Room created successfully')
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Room updated successfully')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Room deleted successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
