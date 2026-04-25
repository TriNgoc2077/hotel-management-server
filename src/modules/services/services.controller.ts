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
import { ServicesService } from './services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  AddBookingServiceDto,
  QueryServiceDto,
} from './dto/service.dto';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/customize';
import { Public } from '@/common/decorators/public.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // QUAN TRỌNG — route order:
  // Routes có prefix tĩnh ('booking/:bookingId') PHẢI đứng trước ':id'
  // Nếu ':id' đứng trước, NestJS match 'booking' như một id string
  // → findOne('booking') → SP trả null → NotFoundException sai

  // POST /services/booking/:bookingId
  @Roles(Role.ADMIN, Role.STAFF)
  @ResponseMessage('Service added to booking successfully')
  @Post('booking/:bookingId')
  addToBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: AddBookingServiceDto,
  ) {
    return this.servicesService.addToBooking(bookingId, dto);
  }

  // GET /services/booking/:bookingId
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch booking services successfully')
  @Get('booking/:bookingId')
  getBookingServices(@Param('bookingId') bookingId: string) {
    return this.servicesService.getBookingServices(bookingId);
  }

  // ─── CRUD (sau các static prefix routes) ───

  @Public()
  @ResponseMessage('Fetch services successfully')
  @Get()
  findAll(@Query() query: QueryServiceDto) {
    return this.servicesService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  @ResponseMessage('Fetch service successfully')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Service created successfully')
  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Service updated successfully')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Service deleted successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
