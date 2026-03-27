import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogsController } from './system-logs.controller';

describe('SystemLogsController', () => {
  let controller: SystemLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemLogsController],
    }).compile();

    controller = module.get<SystemLogsController>(SystemLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
