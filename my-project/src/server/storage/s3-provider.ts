import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export type StorageConfig = {
  bucket?: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  maxSizeBytes: number;
};

export function getStorageConfig(): StorageConfig {
  const maxBytes = process.env.MAX_FILE_SIZE_BYTES
    ? parseInt(process.env.MAX_FILE_SIZE_BYTES, 10)
    : DEFAULT_MAX_FILE_SIZE;

  return {
    bucket: process.env.STORAGE_BUCKET || undefined,
    region: process.env.STORAGE_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || undefined,
    maxSizeBytes: isNaN(maxBytes) ? DEFAULT_MAX_FILE_SIZE : maxBytes,
  };
}

export function isStorageConfigured(): boolean {
  const config = getStorageConfig();
  return Boolean(config.bucket && config.accessKeyId && config.secretAccessKey);
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;
  const config = getStorageConfig();
  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }

  s3ClientInstance = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: Boolean(config.endpoint), // Useful for MinIO / localstack
  });

  return s3ClientInstance;
}

export interface GenerateUploadUrlParams {
  organizationId: string;
  deliverableId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  fileId: string;
  expiresInSeconds: number;
  isLiveStorage: boolean;
}

export async function generatePresignedUploadUrl(
  params: GenerateUploadUrlParams,
): Promise<UploadUrlResult> {
  const config = getStorageConfig();

  // 1. Validate file size
  if (params.fileSize <= 0) {
    throw new Error("INVALID_FILE_SIZE: File must not be empty.");
  }
  if (params.fileSize > config.maxSizeBytes) {
    throw new Error(
      `FILE_TOO_LARGE: File size (${Math.round(params.fileSize / 1024 / 1024)}MB) exceeds limit of ${Math.round(config.maxSizeBytes / 1024 / 1024)}MB.`,
    );
  }

  // 2. Generate opaque, collision-resistant storage key
  const fileId = randomUUID();
  const sanitizedFilename = params.originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
  const storageKey = `orgs/${params.organizationId}/deliverables/${params.deliverableId}/${fileId}-${sanitizedFilename}`;

  // 3. Handle live S3 vs unconfigured environment
  if (!isStorageConfigured()) {
    // When storage is not configured, we provide a structured mock URL and report isLiveStorage = false
    return {
      uploadUrl: `/api/v1/workspaces/mock-storage/upload?key=${encodeURIComponent(storageKey)}`,
      storageKey,
      fileId,
      expiresInSeconds: 900,
      isLiveStorage: false,
    };
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ContentType: params.mimeType,
    ContentLength: params.fileSize,
    Metadata: {
      "organization-id": params.organizationId,
      "deliverable-id": params.deliverableId,
      "original-filename": encodeURIComponent(params.originalFilename),
    },
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    storageKey,
    fileId,
    expiresInSeconds: 900,
    isLiveStorage: true,
  };
}

export async function verifyUploadedObject(
  storageKey: string,
  expectedSize?: number,
): Promise<{ verified: boolean; actualSize?: number; isLiveStorage: boolean }> {
  if (!isStorageConfigured()) {
    return { verified: true, isLiveStorage: false };
  }

  try {
    const client = getS3Client();
    const config = getStorageConfig();
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      }),
    );

    const actualSize = response.ContentLength ?? 0;
    if (expectedSize !== undefined && expectedSize > 0 && actualSize !== expectedSize) {
      return { verified: false, actualSize, isLiveStorage: true };
    }

    return { verified: true, actualSize, isLiveStorage: true };
  } catch {
    return { verified: false, isLiveStorage: true };
  }
}

export async function generatePresignedDownloadUrl(
  storageKey: string,
  originalFilename: string,
): Promise<{ downloadUrl: string; expiresInSeconds: number; isLiveStorage: boolean }> {
  if (!isStorageConfigured()) {
    return {
      downloadUrl: `#storage-not-configured-${encodeURIComponent(storageKey)}`,
      expiresInSeconds: 0,
      isLiveStorage: false,
    };
  }

  const client = getS3Client();
  const config = getStorageConfig();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFilename)}"`,
  });

  const downloadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  return {
    downloadUrl,
    expiresInSeconds: 3600,
    isLiveStorage: true,
  };
}

export async function deleteStoredObject(storageKey: string): Promise<boolean> {
  if (!isStorageConfigured()) return true;

  try {
    const client = getS3Client();
    const config = getStorageConfig();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
