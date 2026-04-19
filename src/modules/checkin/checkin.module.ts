import { Module } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule], // DatabaseService được export từ đây
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
