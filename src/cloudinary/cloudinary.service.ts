import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = '',
  ): Promise<UploadApiResponse> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      // Convertir el buffer del archivo en un stream legible
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
    console.log(`Uploading PDF: ${fileName} to folder: ${folder}`);
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: folder,
          resource_type: 'raw',
          public_id: `${folder}/${fileName}`,
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
    const match = url.match(
      /\/applications\/([^/.]+)\.(jpg|png|jpeg|gif|webp)/,
    );
    return match ? `applications/${match[1]}` : null;
  }

  private extractPDFPublicId(url: string): string | null {
    const match = url.match(
      /\/contracts\/([^/.]+)\.pdf/,
    );
    return match ? `contracts/${match[1]}` : null;
  }
}
