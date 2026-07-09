import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { encrypt } from '../src/utils/encryption';

async function main() {
  console.log('Clearing database tables...');

  // Clear tables in dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.sessionLog.deleteMany({});
  await prisma.userApplication.deleteMany({});
  await prisma.companyApplication.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.windowsServer.deleteMany({});

  console.log('Seeding initial workspace data...');

  const defaultAdminPassword = await bcrypt.hash('admin123', 10);
  const defaultUserPassword = await bcrypt.hash('user123', 10);

  // 1. Create Default Server Node
  const primaryServer = await prisma.windowsServer.create({
    data: {
      name: 'Primary RDP Node',
      publicIp: '3.110.6.9',
      privateIp: '172.31.36.142',
      status: 'ONLINE',
      os: 'Windows Server 2022 Datacenter',
      ram: '32 GB',
      cpu: '8 vCPU',
      storage: '500 GB NVMe SSD',
      health: 'HEALTHY'
    }
  });

  console.log('Server Node created successfully.');

  // 2. Create Applications
  const appTally = await prisma.application.create({
    data: {
      name: 'Tally Prime',
      description: 'Enterprise accounting and inventory management software.',
      icon: 'Calculator',
      executable: 'C:\\Program Files\\TallyPrime\\tally.exe',
      guacamoleConnectionId: 'tally-prime-conn',
      guacamoleConfig: {
        protocol: 'rdp',
        hostname: '172.31.36.142',
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
        hostname: '172.31.36.142',
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
        hostname: '172.31.36.142',
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
        hostname: '172.31.36.142',
        port: 3389,
        security: 'nla',
        ignoreCert: true
      },
      status: 'ACTIVE'
    }
  });

  console.log('Applications created successfully.');

  // 3. Create Companies linked to Server Node
  const companyChanakya = await prisma.company.create({
    data: {
      name: 'Chanakya Group',
      slug: 'chanakya',
      status: 'ACTIVE',
      windowsServerId: primaryServer.id,
      provisionStatus: 'PROVISIONED'
    }
  });

  console.log('Companies created successfully.');

  // 4. Link Applications to Company
  await prisma.companyApplication.createMany({
    data: [
      { companyId: companyChanakya.id, applicationId: appTally.id },
      { companyId: companyChanakya.id, applicationId: appBusy.id },
      { companyId: companyChanakya.id, applicationId: appChrome.id },
      { companyId: companyChanakya.id, applicationId: appExcel.id }
    ]
  });

  // 5. Create Users with WindowsUsername mapping
  const superAdminPassword = await bcrypt.hash('Chanakya123', 10);
  const superAdminUser = await prisma.user.create({
    data: {
      name: 'Chanakya',
      email: 'chanakya.it.tech@gmail.com',
      role: 'SUPER_ADMIN',
      password: superAdminPassword,
      status: 'ACTIVE',
      windowsUsername: process.env.WINDOWS_USERNAME || 'Administrator',
      windowsPassword: encrypt(process.env.WINDOWS_PASSWORD || 'RPGnQ&*zrxcICridR98yDeIR%tfMv7Z2'),
      provisionStatus: 'PROVISIONED'
    }
  });

  const companyAdminUser = await prisma.user.create({
    data: {
      name: 'Chanakya Admin',
      email: 'admin@chanakya.com',
      role: 'COMPANY_ADMIN',
      password: defaultAdminPassword,
      status: 'ACTIVE',
      companyId: companyChanakya.id,
      windowsUsername: 'admin.chanakya',
      windowsPassword: encrypt('admin123'),
      provisionStatus: 'PROVISIONED'
    }
  });

  const clientUser = await prisma.user.create({
    data: {
      name: 'Theertha',
      email: 'theertha@chanakya.com',
      role: 'USER',
      password: defaultUserPassword,
      status: 'ACTIVE',
      companyId: companyChanakya.id,
      windowsUsername: 'theertha.chanakya',
      windowsPassword: encrypt('user123'),
      provisionStatus: 'PROVISIONED'
    }
  });

  console.log('Users created successfully.');

  // 6. Assign Applications to Theertha
  await prisma.userApplication.createMany({
    data: [
      { userId: clientUser.id, applicationId: appTally.id },
      { userId: clientUser.id, applicationId: appBusy.id }
    ]
  });

  // 7. Create Seed Sessions for Dashboard Visuals
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

  // 8. Create Provisioning Logs / Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SERVER_PROVISION',
        module: 'SERVERS',
        status: 'SUCCESS',
        message: 'Primary RDP Node [3.110.6.9] discovered and registered.',
        operator: 'System Daemon'
      },
      {
        action: 'COMPANY_PROVISION',
        module: 'PROVISIONING',
        status: 'SUCCESS',
        message: 'Created local file storage directory for company Chanakya Group on Primary RDP Node.',
        operator: 'superadmin@chanakya.cloud'
      },
      {
        action: 'USER_PROVISION',
        module: 'PROVISIONING',
        status: 'SUCCESS',
        message: 'Created Windows user account theertha.chanakya on Primary RDP Node with RDP and drive mapping rights.',
        operator: 'admin@chanakya.com'
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
