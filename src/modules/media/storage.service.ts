import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../utils/http';
import { logger } from '../../utils/logger';

function client() {
  if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET || !env.DO_SPACES_ENDPOINT || !env.DO_SPACES_BUCKET) {
    return null;
  }
  return new S3Client({
    region: env.DO_SPACES_REGION || 'us-east-1',
    endpoint: env.DO_SPACES_ENDPOINT.startsWith('http') ? env.DO_SPACES_ENDPOINT : `https://${env.DO_SPACES_ENDPOINT}`,
    credentials: { accessKeyId: env.DO_SPACES_KEY, secretAccessKey: env.DO_SPACES_SECRET },
    forcePathStyle: false,
  });
}

export async function uploadPublicObject(input: {
  folder: string;
  filename: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const key = `${input.folder.replace(/\/$/, '')}/${Date.now()}-${randomUUID()}-${input.filename.replace(/[^\w.-]/g, '_')}`;
  const s3 = client();
  if (!s3) {
    throw new AppError(503, 'DigitalOcean Spaces is not configured', 'SPACES_NOT_CONFIGURED');
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: env.DO_SPACES_BUCKET,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ACL: 'public-read',
    }),
  );
  const cdn = env.DO_SPACES_CDN_URL.replace(/\/$/, '');
  const url = cdn ? `${cdn}/${key}` : `https://${env.DO_SPACES_BUCKET}.${env.DO_SPACES_ENDPOINT.replace(/^https?:\/\//, '')}/${key}`;
  logger.info('spaces_upload', { key });
  return { url, key };
}
