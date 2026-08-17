import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';
import { slugify } from '../../utils/slug';

function deserializeTags(value?: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

function serializeTags(tags?: string[] | null): string | null {
  if (!tags?.length) return null;
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  return normalized.length ? normalized.join(', ') : null;
}

function deserializeDetail(value?: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toServiceDto<T extends { searchTags?: string | null; detailContentJson?: string | null }>(service: T) {
  const { searchTags, detailContentJson, ...rest } = service;
  return { ...rest, tags: deserializeTags(searchTags), detailContent: deserializeDetail(detailContentJson) };
}

export async function listCategories() {
  return prisma.serviceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { services: true } } },
  });
}

export async function getCategory(id: number) {
  const category = await prisma.serviceCategory.findUnique({
    where: { id },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
      },
    },
  });
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');
  return category;
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  bannerImageUrl?: string;
  days?: number;
  sortOrder?: number;
}) {
  return prisma.serviceCategory.create({
    data: { ...data, slug: data.slug?.trim() || slugify(data.name) },
  });
}

export async function updateCategory(id: number, data: Partial<Parameters<typeof createCategory>[0]>) {
  await getCategory(id);
  return prisma.serviceCategory.update({
    where: { id },
    data: { ...data, ...(data.name && !data.slug ? { slug: slugify(data.name) } : {}) },
  });
}

export async function toggleCategory(id: number) {
  const category = await getCategory(id);
  return prisma.serviceCategory.update({ where: { id }, data: { isActive: !category.isActive } });
}

export async function deleteCategory(id: number) {
  const category = await prisma.serviceCategory.findUnique({
    where: { id },
    include: { _count: { select: { services: true } } },
  });
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');
  if (category._count.services > 0) {
    throw new AppError(409, 'Category still has services', 'HAS_SERVICES', { count: category._count.services });
  }
  await prisma.serviceCategory.delete({ where: { id } });
  return { deleted: true };
}

const GROUP_SELECT = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  iconUrl: true,
  bannerImageUrl: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { children: true, services: true } },
} as const;

export async function listGroups(parentId?: number | null) {
  const where = parentId === null ? { parentId: null } : parentId !== undefined ? { parentId } : {};
  return prisma.serviceGroup.findMany({
    where,
    select: GROUP_SELECT,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getGroup(id: number) {
  const group = await prisma.serviceGroup.findUnique({ where: { id }, select: GROUP_SELECT });
  if (!group) throw new AppError(404, 'Service group not found', 'NOT_FOUND');
  return group;
}

export async function createGroup(data: {
  name: string;
  slug?: string;
  parentId?: number | null;
  iconUrl?: string | null;
  bannerImageUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
}) {
  return prisma.serviceGroup.create({
    data: { ...data, slug: data.slug?.trim() || slugify(data.name) },
    select: GROUP_SELECT,
  });
}

export async function updateGroup(id: number, data: Partial<Parameters<typeof createGroup>[0]>) {
  await getGroup(id);
  return prisma.serviceGroup.update({
    where: { id },
    data: { ...data, ...(data.name && !data.slug ? { slug: slugify(data.name) } : {}) },
    select: GROUP_SELECT,
  });
}

export async function toggleGroup(id: number) {
  const group = await getGroup(id);
  return prisma.serviceGroup.update({
    where: { id },
    data: { isActive: !group.isActive },
    select: GROUP_SELECT,
  });
}

async function collectDescendantIds(id: number): Promise<number[]> {
  const children = await prisma.serviceGroup.findMany({ where: { parentId: id }, select: { id: true } });
  const nested = await Promise.all(children.map((child) => collectDescendantIds(child.id)));
  return [id, ...children.map((child) => child.id), ...nested.flat()];
}

export async function deleteGroupCascade(id: number) {
  await getGroup(id);
  const allIds = await collectDescendantIds(id);
  await prisma.service.updateMany({ where: { serviceGroupId: { in: allIds } }, data: { serviceGroupId: null } });
  for (const groupId of [...allIds].reverse()) {
    await prisma.serviceGroup.deleteMany({ where: { id: groupId } });
  }
  return { deleted: true, ids: allIds };
}

const SERVICE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, days: true } },
  serviceGroup: { select: { id: true, name: true, slug: true, parentId: true } },
} as const;

export async function listServices(filter: { categoryId?: number; serviceGroupId?: number; page?: number; limit?: number }) {
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const where: { categoryId?: number; serviceGroupId?: number } = {};
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.serviceGroupId) where.serviceGroupId = filter.serviceGroupId;
  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: SERVICE_INCLUDE,
    }),
    prisma.service.count({ where }),
  ]);
  return { services: services.map(toServiceDto), total, page, limit };
}

export async function getService(id: number) {
  const service = await prisma.service.findUnique({ where: { id }, include: SERVICE_INCLUDE });
  if (!service) throw new AppError(404, 'Service not found', 'NOT_FOUND');
  return toServiceDto(service);
}

export async function createService(data: {
  name: string;
  slug?: string;
  categoryId?: number;
  description?: string;
  tags?: string[];
  price?: number;
  mrp?: number | null;
  taxMode?: string;
  taxValue?: number;
  imageUrl?: string;
  detailImageUrl?: string;
  detailContent?: Record<string, unknown> | null;
  duration?: number | null;
  workerCount?: number | null;
  serviceGroupId?: number | null;
  isFeatured?: boolean;
  sortOrder?: number;
}) {
  const { tags, detailContent, categoryId, slug, ...rest } = data;
  const resolvedCategoryId = categoryId ?? (await defaultCategoryId());
  const taxMode = data.taxMode ?? 'NONE';
  const service = await prisma.service.create({
    data: {
      ...rest,
      name: data.name,
      slug: slug?.trim() || slugify(data.name),
      categoryId: resolvedCategoryId,
      taxMode,
      taxValue: taxMode === 'NONE' ? 0 : data.taxValue ?? 0,
      searchTags: serializeTags(tags),
      detailContentJson: detailContent ? JSON.stringify(detailContent) : null,
    },
    include: SERVICE_INCLUDE,
  });
  return toServiceDto(service);
}

export async function updateService(id: number, data: Partial<Parameters<typeof createService>[0]>) {
  await getService(id);
  const { tags, detailContent, slug, ...rest } = data;
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...rest,
      ...(data.name && !slug ? { slug: slugify(data.name) } : slug ? { slug } : {}),
      ...(tags ? { searchTags: serializeTags(tags) } : {}),
      ...(detailContent !== undefined ? { detailContentJson: detailContent ? JSON.stringify(detailContent) : null } : {}),
      ...(data.taxMode === 'NONE' ? { taxValue: 0 } : {}),
    },
    include: SERVICE_INCLUDE,
  });
  return toServiceDto(service);
}

export async function toggleService(id: number) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError(404, 'Service not found', 'NOT_FOUND');
  return toServiceDto(
    await prisma.service.update({ where: { id }, data: { isActive: !service.isActive }, include: SERVICE_INCLUDE }),
  );
}

export async function deleteService(id: number) {
  await getService(id);
  await prisma.service.delete({ where: { id } });
  return { deleted: true };
}

async function defaultCategoryId() {
  const existing = await prisma.serviceCategory.findFirst({ where: { slug: 'single-time' }, select: { id: true } });
  if (existing) return existing.id;
  const first = await prisma.serviceCategory.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
  if (first) return first.id;
  const created = await prisma.serviceCategory.create({
    data: { name: 'Single Time', slug: 'single-time', sortOrder: 0, isActive: true },
    select: { id: true },
  });
  return created.id;
}

export async function listVariants(serviceId: number) {
  return prisma.serviceVariant.findMany({ where: { serviceId }, orderBy: { sortOrder: 'asc' } });
}

export async function getVariant(id: number) {
  const variant = await prisma.serviceVariant.findUnique({
    where: { id },
    include: { service: { select: { id: true, name: true, slug: true } } },
  });
  if (!variant) throw new AppError(404, 'Variant not found', 'NOT_FOUND');
  return variant;
}

export async function createVariant(data: {
  serviceId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  durationMinutes?: number;
  mrp?: number;
  singlePrice?: number;
  price1Month?: number;
  price3Month?: number;
  price6Month?: number;
  price12Month?: number;
  visitsPerMonth?: number;
  validityDays?: number | null;
  totalVisits?: number | null;
  pricePerVisit?: number | null;
  sortOrder?: number;
}) {
  await getService(data.serviceId);
  return prisma.serviceVariant.create({ data });
}

export async function updateVariant(id: number, data: Partial<Parameters<typeof createVariant>[0]>) {
  await getVariant(id);
  return prisma.serviceVariant.update({ where: { id }, data });
}

export async function toggleVariant(id: number) {
  const variant = await getVariant(id);
  return prisma.serviceVariant.update({ where: { id }, data: { isActive: !variant.isActive } });
}

export async function deleteVariant(id: number) {
  await getVariant(id);
  await prisma.serviceVariant.delete({ where: { id } });
  return { deleted: true };
}

export async function getHubServiceAvailability(hubId: number) {
  const hub = await prisma.hub.findUnique({
    where: { id: hubId },
    select: {
      id: true,
      name: true,
      isActive: true,
      serviceRadiusMeters: true,
      city: { select: { id: true, name: true, state: { select: { id: true, name: true } } } },
    },
  });
  if (!hub) throw new AppError(404, 'Hub not found', 'NOT_FOUND');
  const services = await prisma.service.findMany({
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true, slug: true, days: true } },
      serviceGroup: { select: { id: true, name: true, slug: true, parentId: true } },
      hubAvailability: { where: { hubId }, select: { isActive: true, sortOrder: true }, take: 1 },
    },
  });
  return {
    hub,
    services: services.map(({ searchTags, hubAvailability, ...rest }) => ({
      ...rest,
      tags: deserializeTags(searchTags),
      availability: hubAvailability[0] ?? { isActive: false, sortOrder: 0 },
    })),
  };
}

export async function setHubServiceAvailability(
  hubId: number,
  items: { serviceId: number; isActive: boolean; sortOrder?: number | null }[],
) {
  await prisma.hub.findUniqueOrThrow({ where: { id: hubId }, select: { id: true } }).catch(() => {
    throw new AppError(404, 'Hub not found', 'NOT_FOUND');
  });
  await prisma.$transaction(
    items.map((item) =>
      prisma.hubServiceAvailability.upsert({
        where: { hubId_serviceId: { hubId, serviceId: item.serviceId } },
        create: { hubId, serviceId: item.serviceId, isActive: item.isActive, sortOrder: item.sortOrder ?? 0 },
        update: { isActive: item.isActive, sortOrder: item.sortOrder ?? 0 },
      }),
    ),
  );
  return getHubServiceAvailability(hubId);
}
