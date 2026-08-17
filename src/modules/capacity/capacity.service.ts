import { AppError } from '../../utils/http';
import { prisma } from '../../config/database';
import { isDayShiftWindow } from '../daily-capacity/slot-pool-core';

const hhmm = /^\d{2}:\d{2}$/;

export async function listWorkSchedules() {
  return prisma.workSchedule.findMany({
    orderBy: [{ scope: 'asc' }, { shiftStart: 'asc' }],
  });
}

export async function createWorkSchedule(input: {
  name: string;
  shiftStart: string;
  shiftEnd: string;
  scope?: 'GLOBAL' | 'STATE' | 'HUB';
  stateId?: number;
  hubId?: number;
  bookingEnabled?: boolean;
}) {
  if (!hhmm.test(input.shiftStart) || !hhmm.test(input.shiftEnd) || !isDayShiftWindow(input.shiftStart, input.shiftEnd)) {
    throw new AppError(400, 'Overnight and inverted shifts are not allowed', 'OVERNIGHT_SHIFT');
  }
  return prisma.workSchedule.create({
    data: {
      name: input.name,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      scope: input.scope ?? 'GLOBAL',
      stateId: input.stateId,
      hubId: input.hubId,
      bookingEnabled: input.bookingEnabled ?? true,
    },
  });
}

export async function listCapacityGroups(hubId?: number) {
  return prisma.bookingCapacityGroup.findMany({
    where: hubId ? { hubId } : undefined,
    include: {
      hub: { select: { id: true, name: true, cityId: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
      schedules: { include: { workSchedule: true } },
    },
    orderBy: { id: 'desc' },
  });
}

export async function createCapacityGroup(
  actorId: number,
  input: { hubId: number; name: string; serviceIds: number[]; workScheduleIds: number[] },
) {
  if (input.serviceIds.length === 0) throw new AppError(400, 'At least one service is required', 'VALIDATION_ERROR');
  return prisma.bookingCapacityGroup.create({
    data: {
      hubId: input.hubId,
      name: input.name,
      createdById: actorId,
      services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) },
      schedules: { create: input.workScheduleIds.map((workScheduleId) => ({ workScheduleId })) },
    },
    include: {
      services: { include: { service: { select: { id: true, name: true } } } },
      schedules: { include: { workSchedule: true } },
    },
  });
}

export async function toggleCapacityGroup(id: number) {
  const group = await prisma.bookingCapacityGroup.findUnique({ where: { id } });
  if (!group) throw new AppError(404, 'Capacity group not found', 'NOT_FOUND');
  return prisma.bookingCapacityGroup.update({ where: { id }, data: { isActive: !group.isActive } });
}

export async function listDailyCapacity(groupId: number, dateFrom: string, dateTo: string) {
  return prisma.bookingCapacityDaily.findMany({
    where: {
      groupId,
      capacityDate: { gte: new Date(`${dateFrom}T00:00:00.000Z`), lte: new Date(`${dateTo}T00:00:00.000Z`) },
    },
    include: { workSchedule: true },
    orderBy: [{ capacityDate: 'asc' }, { workScheduleId: 'asc' }],
  });
}

export async function upsertDailyCapacity(
  actorId: number,
  input: { groupId: number; capacityDate: string; workScheduleId: number; heroCount: number; notes?: string },
) {
  if (!Number.isInteger(input.heroCount) || input.heroCount < 0) {
    throw new AppError(400, 'heroCount must be a non-negative integer', 'VALIDATION_ERROR');
  }
  return prisma.bookingCapacityDaily.upsert({
    where: {
      groupId_capacityDate_workScheduleId: {
        groupId: input.groupId,
        capacityDate: new Date(`${input.capacityDate}T00:00:00.000Z`),
        workScheduleId: input.workScheduleId,
      },
    },
    create: {
      groupId: input.groupId,
      capacityDate: new Date(`${input.capacityDate}T00:00:00.000Z`),
      workScheduleId: input.workScheduleId,
      heroCount: input.heroCount,
      notes: input.notes,
      setById: actorId,
    },
    update: { heroCount: input.heroCount, notes: input.notes, setById: actorId },
    include: { workSchedule: true },
  });
}
