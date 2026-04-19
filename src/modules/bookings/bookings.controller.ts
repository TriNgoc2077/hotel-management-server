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
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  QueryBookingDto,
} from './dto/booking.dto';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/customize';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch available rooms successfully')
  @Get('available')
  findAvailable(
    @Query('room_type_id') roomTypeId: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
    @Query('capacity') capacity: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.bookingsService.findAvailableRoomTypes(
      roomTypeId,
      checkIn,
      checkOut,
      Number(capacity) || 1,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Fetch bookings successfully')
  @Get()
  findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch booking successfully')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Booking created successfully')
  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Booking updated successfully')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Booking cancelled successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}