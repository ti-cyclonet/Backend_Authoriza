import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    constructor(private configService: ConfigService) {
      }
      async uploadImage(file: Express.Multer.File, folder: string): Promise<any> {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            },
          );
      
          // Convertir el buffer a un stream legible
          Readable.from(file.buffer).pipe(stream);
        });
      }
}
