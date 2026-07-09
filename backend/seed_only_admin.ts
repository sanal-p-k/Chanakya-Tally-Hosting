import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { encrypt } from './src/utils/encryption';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Chanakya Super Admin...');

  const superAdminPassword = await bcrypt.hash('Chanakya123', 10);
  const windowsUsername = process.env.WINDOWS_USERNAME || 'Administrator';
  const windowsPassword = process.env.WINDOWS_PASSWORD || 'RPGnQ&*zrxcICridR98yDeIR%tfMv7Z2';

  const admin = await prisma.user.upsert({
    where: { email: 'chanakya.it.tech@gmail.com' },
    update: {
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      name: 'Chanakya',
      windowsUsername: windowsUsername,
      windowsPassword: encrypt(windowsPassword),
      provisionStatus: 'PROVISIONED',
      status: 'ACTIVE'
    },
    create: {
      email: 'chanakya.it.tech@gmail.com',
      name: 'Chanakya',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      windowsUsername: windowsUsername,
      windowsPassword: encrypt(windowsPassword),
      provisionStatus: 'PROVISIONED',
      status: 'ACTIVE'
    }
  });
  
  console.log('Successfully seeded admin user:', admin.email);
}

main()
  .catch(e => {
    console.error('Error seeding admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
