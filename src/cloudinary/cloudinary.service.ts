import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private folderPrefix: string;

  constructor(private configService: ConfigService) {
    this.folderPrefix = this.configService.get<string>('CLOUDINARY_FOLDER_PREFIX') || '';
  }

  private prefixFolder(folder: string): string {
    const cleanFolder = folder.replace(/^\//, '');
    return this.folderPrefix ? `${this.folderPrefix}/${cleanFolder}` : cleanFolder;
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = '',
  ): Promise<UploadApiResponse> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: this.prefixFolder(folder) },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });

    return result;
  }

  async uploadPDF(
    pdfBuffer: Buffer,
    fileName: string,
    folder: string = 'contracts'
  ): Promise<UploadApiResponse> {
    console.log(`Uploading PDF: ${fileName} to folder: ${this.prefixFolder(folder)}`);
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: this.prefixFolder(folder),
          resource_type: 'raw',
          public_id: fileName,
          use_filename: true,
          unique_filename: false
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(pdfBuffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });

    return result;
  }

  async deleteImageByUrl(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  }

  async deletePDFByUrl(url: string): Promise<void> {
    const publicId = this.extractPDFPublicId(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }

  private extractPublicId(url: string): string | null {
    const prefix = this.folderPrefix ? `${this.folderPrefix}/` : '';
    const pattern = new RegExp(`\\/${prefix.replace(/\//g, '\\/')}?applications\\/([^/.]+)\\.(jpg|png|jpeg|gif|webp)`);
    const match = url.match(pattern);
    return match ? `${prefix}applications/${match[1]}` : null;
  }

  private extractPDFPublicId(url: string): string | null {
    const prefix = this.folderPrefix ? `${this.folderPrefix}/` : '';
    const pattern = new RegExp(`\\/${prefix.replace(/\//g, '\\/')}?contracts\\/([^/.]+)\\.pdf`);
    const match = url.match(pattern);
    return match ? `${prefix}contracts/${match[1]}` : null;
  }
}
