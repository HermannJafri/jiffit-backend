import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';

export async function listSettings(category?: string) {
  return prisma.appSetting.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
}

export async function getSetting(key: string) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) throw new AppError(404, 'Setting not found', 'NOT_FOUND');
  return row;
}

export async function upsertSetting(input: { key: string; value: string; type?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'; category: string; label: string; isPublic?: boolean }) {
  return prisma.appSetting.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      value: input.value,
      type: input.type ?? 'STRING',
      category: input.category,
      label: input.label,
      isPublic: input.isPublic ?? false,
    },
    update: { value: input.value, label: input.label, category: input.category, isPublic: input.isPublic },
  });
}

export async function listPublicSettings() {
  return prisma.appSetting.findMany({
    where: { isPublic: true },
    select: { key: true, value: true, type: true, category: true, label: true },
  });
}
