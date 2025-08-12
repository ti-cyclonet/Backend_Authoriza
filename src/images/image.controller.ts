import { Controller, Post, UploadedFile, UseInterceptors, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';

@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload/:packageId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Param('packageId') packageId: string,
  ) {
    const uploadResult: any = await this.imageService.uploadToCloudinary(file);
    return await this.imageService.saveImage(file.originalname, uploadResult.secure_url, packageId);
  }
}
