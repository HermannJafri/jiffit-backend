import { prisma } from '../../config/database';
import { AppError } from '../../utils/http';

const addressInclude = {
  city: { select: { id: true, name: true, state: { select: { id: true, name: true, code: true } } } },
} as const;

export async function listCustomerAddresses(customerId: number) {
  return prisma.customerAddress.findMany({
    where: { customerId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    include: addressInclude,
  });
}

export async function getCustomerAddress(customerId: number, id: number) {
  const address = await prisma.customerAddress.findFirst({
    where: { id, customerId, isActive: true },
    include: addressInclude,
  });
  if (!address) throw new AppError(404, 'Address not found', 'NOT_FOUND');
  return address;
}

export async function createCustomerAddress(
  customerId: number,
  data: {
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    cityId: number;
    pincode: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  },
) {
  const city = await prisma.city.findFirst({ where: { id: data.cityId, isActive: true } });
  if (!city) throw new AppError(400, 'City is not available', 'INVALID_CITY');

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
    }
    const count = await tx.customerAddress.count({ where: { customerId, isActive: true } });
    return tx.customerAddress.create({
      data: {
        customerId,
        label: data.label?.trim() || 'Home',
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2?.trim(),
        cityId: data.cityId,
        pincode: data.pincode.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault ?? count === 0,
      },
      include: addressInclude,
    });
  });
}

export async function updateCustomerAddress(
  customerId: number,
  id: number,
  data: Partial<{
    label: string;
    addressLine1: string;
    addressLine2: string | null;
    cityId: number;
    pincode: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
  }>,
) {
  await getCustomerAddress(customerId, id);
  if (data.cityId) {
    const city = await prisma.city.findFirst({ where: { id: data.cityId, isActive: true } });
    if (!city) throw new AppError(400, 'City is not available', 'INVALID_CITY');
  }
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
    }
    return tx.customerAddress.update({
      where: { id },
      data,
      include: addressInclude,
    });
  });
}

export async function deleteCustomerAddress(customerId: number, id: number) {
  const address = await getCustomerAddress(customerId, id);
  await prisma.customerAddress.update({ where: { id }, data: { isActive: false, isDefault: false } });
  if (address.isDefault) {
    const next = await prisma.customerAddress.findFirst({
      where: { customerId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  return { deleted: true };
}
