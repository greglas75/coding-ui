/**
 * File Validation Utilities
 * Validates uploaded files using magic bytes detection
 */
import path from 'path';

/**
 * Validates file content using magic bytes (real file type detection)
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<boolean>} - True if valid
 * @throws {Error} - If file validation fails
 */
export async function validateFileContent(filePath) {
  try {
    const { fileTypeFromFile } = await import('file-type');
    const fileType = await fileTypeFromFile(filePath);

    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', // .xlsx is ZIP with XML
    ];

    // CSV has no magic bytes, so if fileType is null, check extension
    if (!fileType) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.csv') {
        return true; // CSV is OK (no magic bytes is normal)
      }
      throw new Error('Cannot determine file type');
    }

    if (!allowedMimeTypes.includes(fileType.mime)) {
      throw new Error(`Invalid file content type: ${fileType.mime}. Only CSV/Excel allowed.`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}
