import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.roleDefinition.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: 'Full access' },
  });
  await prisma.roleDefinition.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Operations admin' },
  });
  await prisma.roleDefinition.upsert({
    where: { name: 'HR' },
    update: {},
    create: { name: 'HR', description: 'Human resources' },
  });
  await prisma.roleDefinition.upsert({
    where: { name: 'OPERATIONS' },
    update: {},
    create: { name: 'OPERATIONS', description: 'Day-to-day ops' },
  });

  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow!123';
  const existing = await prisma.dashboardUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.dashboardUser.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 12),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        mustResetPassword: true,
      },
    });
    console.log(`Seeded dashboard user '${username}'. Change the password immediately.`);
  }

  await prisma.appSetting.upsert({
    where: { key: 'booking.bufferMinutes' },
    update: {},
    create: {
      key: 'booking.bufferMinutes',
      value: '15',
      type: 'NUMBER',
      category: 'booking',
      label: 'Slot buffer minutes',
      isPublic: false,
    },
  });

  const dayShift = await prisma.workSchedule.findFirst({ where: { scope: 'GLOBAL', name: 'Day shift' } });
  if (!dayShift) {
    await prisma.workSchedule.create({
      data: {
        name: 'Day shift',
        scope: 'GLOBAL',
        shiftStart: '09:30',
        shiftEnd: '18:30',
        bookingEnabled: true,
        isActive: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
