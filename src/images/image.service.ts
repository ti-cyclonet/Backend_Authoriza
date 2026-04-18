import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { v2 as cloudinary } from 'cloudinary';
import toStream = require('buffer-to-stream');
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageService {
  private folderPrefix: string;

  constructor(
    @InjectRepository(Image)
    private imageRepository: Repository<Image>,
    private configService: ConfigService
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
    this.folderPrefix = this.configService.get<string>('CLOUDINARY_FOLDER_PREFIX') || '';
  }

  private prefixFolder(folder: string): string {
    return this.folderPrefix ? `${this.folderPrefix}/${folder}` : folder;
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
  ): Promise<{ public_id: string; secure_url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: this.prefixFolder(folder) },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }

  async uploadToCloudinary(file: Express.Multer.File) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: this.prefixFolder('packages') }, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        })
        .end(file.buffer);
    });
  }

  async uploadBase64(base64DataUrl: string, folder = 'packages') {
    const result = await cloudinary.uploader.upload(base64DataUrl, {
      folder: this.prefixFolder(folder),
      resource_type: 'image',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.public_id,
    };
  }

  async saveImage(fileName: string, url: string, pkgId: string) {
    const image = this.imageRepository.create({
      fileName,
      url,
      package: { id: pkgId },
    });
    return await this.imageRepository.save(image);
  }
}
