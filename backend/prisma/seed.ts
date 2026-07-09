import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Clearing database tables...');
  
  // Clear tables in dependency order
  await prisma.sessionLog.deleteMany({});
  await prisma.userApplication.deleteMany({});
  await prisma.companyApplication.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('Seeding initial workspace data...');

  const defaultAdminPassword = await bcrypt.hash('admin123', 10);
  const defaultUserPassword = await bcrypt.hash('user123', 10);

  // 1. Create Applications
  const appTally = await prisma.application.create({
    data: {
      name: 'Tally Prime',
      description: 'Enterprise accounting and inventory management software.',
      icon: 'Calculator',
      executable: 'C:\\Program Files\\TallyPrime\\tally.exe',
      guacamoleConnectionId: 'tally-prime-conn',
      guacamoleConfig: {
        protocol: 'rdp',
        hostname: '10.0.0.10',
        port: 3389,
        security: 'nla',
        ignoreCert: true
      },
      status: 'ACTIVE'
    }
  });

  const appBusy = await prisma.application.create({
    data: {
      name: 'Busy',
      description: 'Robust accounting software for small and medium businesses.',
      icon: 'Briefcase',
      executable: 'C:\\BusyWin\\busy.exe',
      guacamoleConnectionId: 'busy-conn',
      guacamoleConfig: {
        protocol: 'rdp',
        hostname: '10.0.0.11',
        port: 3389,
        security: 'nla',
        ignoreCert: true
      },
      status: 'ACTIVE'
    }
  });

  const appChrome = await prisma.application.create({
    data: {
      name: 'Chrome',
      description: 'Google Chrome web browser for internal web applications.',
      icon: 'Globe',
      executable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      guacamoleConnectionId: 'chrome-conn',
      guacamoleConfig: {
        protocol: 'rdp',
        hostname: '10.0.0.12',
        port: 3389,
        security: 'nla',
        ignoreCert: true
      },
      status: 'ACTIVE'
    }
  });

  const appExcel = await prisma.application.create({
    data: {
      name: 'Excel',
      description: 'Microsoft Excel spreadsheet processor.',
      icon: 'FileSpreadsheet',
      executable: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
      guacamoleConnectionId: 'excel-conn',
      guacamoleConfig: {
        protocol: 'rdp',
        hostname: '10.0.0.13',
        port: 3389,
        security: 'nla',
        ignoreCert: true
      },
      status: 'ACTIVE'
    }
  });

  console.log('Applications created successfully.');

  // 2. Create Companies
  const companyChanakya = await prisma.company.create({
    data: {
      name: 'Chanakya Group',
      slug: 'chanakya',
      status: 'ACTIVE'
    }
  });

  console.log('Companies created successfully.');

  // 3. Link Applications to Company
  await prisma.companyApplication.createMany({
    data: [
      { companyId: companyChanakya.id, applicationId: appTally.id },
      { companyId: companyChanakya.id, applicationId: appBusy.id },
      { companyId: companyChanakya.id, applicationId: appChrome.id },
      { companyId: companyChanakya.id, applicationId: appExcel.id }
    ]
  });

  // 4. Create Users
  const superAdminUser = await prisma.user.create({
    data: {
      name: 'Chanakya Super Admin',
      email: 'superadmin@chanakya.cloud',
      role: 'SUPER_ADMIN',
      password: defaultAdminPassword,
      status: 'ACTIVE'
    }
  });

  const companyAdminUser = await prisma.user.create({
    data: {
      name: 'Chanakya Admin',
      email: 'admin@chanakya.com',
      role: 'COMPANY_ADMIN',
      password: defaultAdminPassword,
      status: 'ACTIVE',
      companyId: companyChanakya.id
    }
  });

  const clientUser = await prisma.user.create({
    data: {
      name: 'Theertha',
      email: 'theertha@chanakya.com',
      role: 'USER',
      password: defaultUserPassword,
      status: 'ACTIVE',
      companyId: companyChanakya.id
    }
  });

  console.log('Users created successfully.');

  // 5. Assign Applications to Theertha
  await prisma.userApplication.createMany({
    data: [
      { userId: clientUser.id, applicationId: appTally.id },
      { userId: clientUser.id, applicationId: appBusy.id }
    ]
  });

  // 6. Create Seed Sessions for Dashboard Visuals
  await prisma.sessionLog.createMany({
    data: [
      {
        userId: clientUser.id,
        companyId: companyChanakya.id,
        applicationId: appTally.id,
        applicationName: 'Tally Prime',
        launchedAt: new Date(Date.now() - 3 * 3600000), // 3 hours ago
        endedAt: new Date(Date.now() - 2.2 * 3600000),
        status: 'COMPLETED'
      },
      {
        userId: clientUser.id,
        companyId: companyChanakya.id,
        applicationId: appBusy.id,
        applicationName: 'Busy',
        launchedAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
        endedAt: new Date(Date.now() - 0.5 * 3600000),
        status: 'COMPLETED'
      },
      {
        userId: clientUser.id,
        companyId: companyChanakya.id,
        applicationId: appTally.id,
        applicationName: 'Tally Prime',
        launchedAt: new Date(Date.now() - 10 * 60000), // 10 mins ago
        status: 'ACTIVE'
      }
    ]
  });

  console.log('Database seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
