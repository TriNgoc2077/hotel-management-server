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
  Req,
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
import { Public } from '@/common/decorators/public.decorator';
import { ApplyCouponDto, CreateCouponDto } from './dto/coupon.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Coupon
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/coupon')
  createCoupon(@Body() createCouponDto: CreateCouponDto) {
    return this.bookingsService.createCoupon(createCouponDto);
  }

  @Public()
  @Get('/coupons')
  findAllCoupon() {
    return this.bookingsService.findAllCoupon();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @Post('/coupon/use')
  applyCoupon(@Body() applyCouponDto: ApplyCouponDto) {
    return this.bookingsService.applyCoupon(applyCouponDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/coupon/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.bookingsService.deleteCoupon(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.CUSTOMER)
  @ResponseMessage('Fetch my bookings successfully')
  @Get('my-bookings')
  findMyBookings(@Req() req: any) {
    return this.bookingsService.findMyBookings(req.user.sub);
  }

  @Public()
  @Get('/qr')
  getQrPayment(@Query('amount') amount: number, @Query('description') description: string) {
    return this.bookingsService.getPaymentQr(amount, description);
  }

  @Public()
  // @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)  
  @ResponseMessage('Fetch available rooms successfully')
  @Get('available')
  findAvailable(
    @Query('roomTypeId') roomTypeId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
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
  @ResponseMessage('Confirm booking successfully')
  @Patch('confirm/:id')
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirmBooking(id);
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

    // PATCH /bookings/:id/check-in
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('check-in/:id')
  checkIn(@Param('id') id: string) {
    return this.bookingsService.checkIn(id);
  }

  // PATCH /bookings/:id/check-out
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('check-out/:id')
  checkOut(@Param('id') id: string) {
    return this.bookingsService.checkOut(id);
  }

}