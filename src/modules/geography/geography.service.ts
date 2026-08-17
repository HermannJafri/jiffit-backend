import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';

export async function listStates() {
  return prisma.state.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { cities: true } } },
  });
}

export async function createState(data: { name: string; code: string }) {
  return prisma.state.create({ data: { name: data.name.trim(), code: data.code.trim().toUpperCase() } });
}

export async function updateState(id: number, data: { name?: string; code?: string }) {
  await ensureState(id);
  return prisma.state.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
    },
  });
}

export async function toggleState(id: number) {
  const state = await ensureState(id);
  return prisma.state.update({ where: { id }, data: { isActive: !state.isActive } });
}

export async function listCities(stateId?: number) {
  return prisma.city.findMany({
    where: stateId ? { stateId } : undefined,
    orderBy: { name: 'asc' },
    include: {
      state: { select: { id: true, name: true, code: true } },
      _count: { select: { hubs: true } },
    },
  });
}

export async function createCity(data: { name: string; stateId: number; bookingCutoffTime?: string | null; imageUrl?: string }) {
  await ensureState(data.stateId);
  return prisma.city.create({
    data,
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export async function updateCity(
  id: number,
  data: { name?: string; stateId?: number; bookingCutoffTime?: string | null; imageUrl?: string | null },
) {
  await ensureCity(id);
  if (data.stateId) await ensureState(data.stateId);
  return prisma.city.update({
    where: { id },
    data,
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export async function toggleCity(id: number) {
  const city = await ensureCity(id);
  return prisma.city.update({ where: { id }, data: { isActive: !city.isActive } });
}

const hubInclude = {
  city: { include: { state: { select: { id: true, name: true, code: true } } } },
  manager: { select: { id: true, name: true, username: true, role: true } },
  _count: { select: { heroes: true } },
} as const;

export async function listHubs(cityId?: number) {
  return prisma.hub.findMany({
    where: cityId ? { cityId } : undefined,
    orderBy: { name: 'asc' },
    include: hubInclude,
  });
}

export async function getHub(id: number) {
  const hub = await prisma.hub.findUnique({ where: { id }, include: hubInclude });
  if (!hub) throw new AppError(404, 'Hub not found', 'NOT_FOUND');
  return hub;
}

export async function createHub(data: {
  cityId: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  checkinRadiusMeters?: number;
  serviceRadiusMeters?: number;
  managerId?: number;
}) {
  await ensureCity(data.cityId);
  return prisma.hub.create({ data, include: hubInclude });
}

export async function updateHub(
  id: number,
  data: {
    cityId?: number;
    name?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    checkinRadiusMeters?: number;
    serviceRadiusMeters?: number;
    managerId?: number | null;
  },
) {
  await getHub(id);
  if (data.cityId) await ensureCity(data.cityId);
  return prisma.hub.update({ where: { id }, data, include: hubInclude });
}

export async function toggleHub(id: number) {
  const hub = await getHub(id);
  return prisma.hub.update({ where: { id }, data: { isActive: !hub.isActive }, include: hubInclude });
}

async function ensureState(id: number) {
  const state = await prisma.state.findUnique({ where: { id } });
  if (!state) throw new AppError(404, 'State not found', 'NOT_FOUND');
  return state;
}

async function ensureCity(id: number) {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) throw new AppError(404, 'City not found', 'NOT_FOUND');
  return city;
}
