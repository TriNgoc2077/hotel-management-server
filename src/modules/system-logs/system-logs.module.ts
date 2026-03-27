import { Module } from '@nestjs/common';
import { SystemLogsService } from './system-logs.service';
import { SystemLogsController } from './system-logs.controller';

@Module({
  providers: [SystemLogsService],
  controllers: [SystemLogsController],
  exports: [SystemLogsService]
})
export class SystemLogsModule {}
