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

  // QUAN TRỌNG — route order:
  // Static routes ('available') PHẢI đứng trước dynamic routes (':id')
  // Nếu đổi thứ tự, NestJS match 'available' như một :id string → findOne('available') → 404 sai

  // GET /bookings/available?room_type_id=x&check_in=...&check_out=...
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch available rooms successfully')
  @Get('available')
  findAvailable(
    @Query('room_type_id') roomTypeId: string,
    @Query('check_in') checkIn: string,
    @Query('check_out') checkOut: string,
  ) {
    return this.bookingsService.findAvailableRoomTypes(
      roomTypeId,
      checkIn,
      checkOut,
    );
  }

  // GET /bookings?page=1&limit=10&status=Pending&customer_id=xxx
  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Fetch bookings successfully')
  @Get()
  findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  // GET /bookings/:id
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch booking successfully')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  // POST /bookings
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Booking created successfully')
  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  // PATCH /bookings/:id
  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Booking updated successfully')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }

  // DELETE /bookings/:id → cancel
  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Booking cancelled successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}
