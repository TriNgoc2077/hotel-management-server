import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, Body } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { UseGuards } from '@nestjs/common';
import { RoomTypesService } from '../room-types/room-types.service';

// File filter
const imageFileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    return callback(new BadRequestException('Only image files (jpg, jpeg, png) are allowed!'), false);
  }
  callback(null, true);
};

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly roomTypesService: RoomTypesService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Images are required');
    }
    const urls = await this.uploadService.uploadImages(files);
    return {
      message: 'Images uploaded successfully',
      urls: urls,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('room-type-images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadRoomTypeImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('roomTypeId') roomTypeId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Images are required');
    }
    if (!roomTypeId) {
      throw new BadRequestException('roomTypeId is required');
    }

    // verify room type exists
    const roomType = await this.roomTypesService.findOne(roomTypeId);

    const urls = await this.uploadService.uploadImages(files);

    let existingImages: string[] = [];
    if (roomType.images) {
      try {
        existingImages = typeof roomType.images === 'string' ? JSON.parse(roomType.images) : roomType.images;
      } catch (e) {
        // ignore
      }
    }
    const newImages = [...(Array.isArray(existingImages) ? existingImages : []), ...urls];

    await this.roomTypesService.update(roomTypeId, {
      images: newImages,
    });

    return {
      message: 'Images uploaded and saved to room type successfully',
      urls: urls,
      roomTypeId: roomTypeId,
    };
  }
}
