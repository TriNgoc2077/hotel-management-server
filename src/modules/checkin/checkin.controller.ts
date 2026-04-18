import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  // PATCH /bookings/:id/check-in
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch(':id/check-in')
  checkIn(@Param('id') id: string) {
    return this.checkinService.checkIn(id);
  }

  // PATCH /bookings/:id/check-out
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch(':id/check-out')
  checkOut(@Param('id') id: string) {
    return this.checkinService.checkOut(id);
  }
}
