import { prisma } from '../../config/database';
import { pickServiceableHub } from '../../utils/haversine';

export interface PublicCatalogScope {
  hubId?: number;
  latitude?: number;
  longitude?: number;
}

interface PublicCatalogContext {
  isScoped: boolean;
  hub: { id: number; name: string; cityId: number } | null;
  serviceIds: number[] | null;
}

function deserializeTags(value?: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
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

function mapPublicService<
  T extends {
    searchTags?: string | null;
    detailContentJson?: string | null;
    category?: { name: string } | null;
    serviceGroup?: { name: string } | null;
  },
>(service: T) {
  const { searchTags, detailContentJson, ...rest } = service;
  return {
    ...rest,
    tags: deserializeTags(searchTags),
    detailContent: deserializeDetail(detailContentJson),
    categoryName: service.category?.name ?? null,
    serviceGroupName: service.serviceGroup?.name ?? null,
  };
}

async function resolvePublicCatalogContext(scope?: PublicCatalogScope): Promise<PublicCatalogContext> {
  const hubId = Number.isFinite(scope?.hubId) ? Number(scope!.hubId) : undefined;
  const hasCoords = Number.isFinite(scope?.latitude) && Number.isFinite(scope?.longitude);
  const isScoped = Boolean(hubId || hasCoords);
  if (!isScoped) return { isScoped: false, hub: null, serviceIds: null };

  let hub: { id: number; name: string; cityId: number } | null = null;
  if (hubId) {
    hub = await prisma.hub.findFirst({
      where: { id: hubId, isActive: true },
      select: { id: true, name: true, cityId: true },
    });
  } else if (hasCoords) {
    const hubs = await prisma.hub.findMany({
      where: { isActive: true },
      select: { id: true, name: true, cityId: true, latitude: true, longitude: true, serviceRadiusMeters: true },
    });
    const picked = pickServiceableHub(Number(scope!.latitude), Number(scope!.longitude), hubs);
    hub = picked ? { id: picked.id, name: picked.name, cityId: picked.cityId } : null;
  }

  if (!hub) return { isScoped: true, hub: null, serviceIds: [] };

  const availability = await prisma.hubServiceAvailability.findMany({
    where: { hubId: hub.id, isActive: true },
    select: { serviceId: true },
  });
  return { isScoped: true, hub, serviceIds: availability.map((row) => row.serviceId) };
}

export async function getPublicCatalogScope(scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  return {
    hubId: context.hub?.id ?? null,
    hubName: context.hub?.name ?? null,
    cityId: context.hub?.cityId ?? null,
    isServiceable: Boolean(context.hub),
  };
}

function scopedServiceWhere<T extends Record<string, unknown>>(base: T, context: PublicCatalogContext) {
  if (!context.isScoped || !context.serviceIds) return base;
  return { ...base, id: { in: context.serviceIds } };
}

export async function getPublicCategories(scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  if (context.isScoped && !context.serviceIds?.length) return [];
  const serviceWhere = scopedServiceWhere({ isActive: true }, context);
  return prisma.serviceCategory.findMany({
    where: { isActive: true, services: { some: serviceWhere } },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      iconUrl: true,
      bannerImageUrl: true,
      days: true,
      sortOrder: true,
      _count: { select: { services: { where: serviceWhere } } },
    },
  });
}

export async function getPublicServiceGroups(scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  if (context.isScoped && !context.serviceIds?.length) return [];
  const serviceWhere = scopedServiceWhere({ isActive: true }, context);
  return prisma.serviceGroup.findMany({
    where: { isActive: true, services: { some: serviceWhere } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      iconUrl: true,
      bannerImageUrl: true,
      description: true,
      sortOrder: true,
      _count: { select: { services: { where: serviceWhere } } },
    },
  });
}

export async function getPublicGroupServices(groupId: number, scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  if (context.isScoped && !context.serviceIds?.length) return [];
  const services = await prisma.service.findMany({
    where: scopedServiceWhere({ isActive: true, serviceGroupId: groupId }, context),
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      serviceGroup: { select: { id: true, name: true, slug: true } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  return services.map(mapPublicService);
}

export async function getPublicService(serviceId: number, scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  if (context.isScoped && context.serviceIds && !context.serviceIds.includes(serviceId)) return null;
  const service = await prisma.service.findFirst({
    where: { id: serviceId, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      serviceGroup: { select: { id: true, name: true, slug: true } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  return service ? mapPublicService(service) : null;
}

export async function searchPublicServices(query: string, scope?: PublicCatalogScope) {
  const context = await resolvePublicCatalogContext(scope);
  if (context.isScoped && !context.serviceIds?.length) return [];
  const q = query.trim();
  const services = await prisma.service.findMany({
    where: scopedServiceWhere(
      {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { searchTags: { contains: q } },
        ],
      },
      context,
    ),
    take: 30,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      serviceGroup: { select: { id: true, name: true, slug: true } },
    },
  });
  return services.map(mapPublicService);
}

export async function listPublicCities() {
  return prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      state: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function listPublicHubs(cityId?: number) {
  return prisma.hub.findMany({
    where: { isActive: true, ...(cityId ? { cityId } : {}) },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      cityId: true,
      latitude: true,
      longitude: true,
      serviceRadiusMeters: true,
    },
  });
}
