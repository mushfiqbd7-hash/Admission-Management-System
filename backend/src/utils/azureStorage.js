// backend/src/utils/azureStorage.js
// Azure Blob Storage utility — upload, delete, stream-to-response

import { BlobServiceClient } from '@azure/storage-blob';

const getContainerClient = () => {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING env var not set');
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'sams-uploads';
  const client = BlobServiceClient.fromConnectionString(connStr);
  return client.getContainerClient(containerName);
};

/**
 * Upload a Buffer to Azure Blob Storage.
 * @param {string} blobName  — path inside container e.g. "documents/123/passport_1234.pdf"
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {string} blobName
 */
export const uploadBuffer = async (blobName, buffer, mimeType) => {
  const containerClient = getContainerClient();
  await containerClient.createIfNotExists(); // no access param = private by default
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType || 'application/octet-stream' },
  });
  return blobName;
};

/**
 * Delete a blob by name. Silent fail if not found.
 * @param {string} blobName
 */
export const deleteBlob = async (blobName) => {
  if (!blobName) return;
  try {
    const containerClient = getContainerClient();
    await containerClient.getBlockBlobClient(blobName).deleteIfExists();
  } catch (_) { /* silent */ }
};

/**
 * Stream a blob directly to an Express response.
 * @param {string} blobName
 * @param {object} res       — Express response object
 * @param {string} fileName  — original file name for Content-Disposition
 * @param {string} mimeType
 */
export const streamBlobToResponse = async (blobName, res, fileName, mimeType) => {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const exists = await blockBlobClient.exists();
  if (!exists) throw Object.assign(new Error('Blob not found'), { code: 'BLOB_NOT_FOUND' });

  const downloadResponse = await blockBlobClient.download(0);
  const safeName = (fileName || 'document').replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  downloadResponse.readableStreamBody.pipe(res);
};

/**
 * Download a blob into a Buffer (for ZIP export etc.).
 * @param {string} blobName
 * @returns {Buffer}
 */
export const downloadBlobToBuffer = async (blobName) => {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return blockBlobClient.downloadToBuffer();
};

