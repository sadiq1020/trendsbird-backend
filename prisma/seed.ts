import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MODULE_PERMISSIONS = [
  {
    group: 'Dashboard',
    actions: ['watch'],
  },
  {
    group: 'Permission',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'Role',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'User',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'Media',
    actions: ['watch', 'read', 'upload', 'write', 'delete'],
  },
  {
    group: 'Category',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'Brand',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'Attribute',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
  {
    group: 'Product',
    actions: ['watch', 'create', 'read', 'update', 'delete'],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  const createdPermissions: Array<{ id: string; name: string; groupName: string }> = [];

  for (const moduleDef of MODULE_PERMISSIONS) {
    let group = await prisma.permissionGroup.findUnique({
      where: { name: moduleDef.group },
    });

    if (!group) {
      group = await prisma.permissionGroup.create({
        data: {
          name: moduleDef.group,
          description: `${moduleDef.group} module permissions`,
        },
      });
    }

    const prefix = moduleDef.group.toLowerCase();
    for (const action of moduleDef.actions) {
      const permName = `${prefix}:${action}`;
      let perm = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (!perm) {
        perm = await prisma.permission.create({
          data: {
            name: permName,
            description: `${action} permission for ${moduleDef.group}`,
            groupId: group.id,
          },
        });
      }

      createdPermissions.push({ id: perm.id, name: perm.name, groupName: moduleDef.group });
    }
  }

  // 1. Super Admin Role (holding all permissions)
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'Super Admin' },
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Super Administrator with full system access',
        status: true,
      },
    });
  }

  // Sync Super Admin permissions
  const allPermIds = createdPermissions.map((p) => p.id);
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermIds.map((permissionId) => ({
      roleId: superAdminRole.id,
      permissionId,
    })),
  });

  // 2. Catalog Manager Role (deliberately limited — catalog access only, NO permission, role, or user access)
  let catalogRole = await prisma.role.findUnique({
    where: { name: 'Catalog Manager' },
  });

  if (!catalogRole) {
    catalogRole = await prisma.role.create({
      data: {
        name: 'Catalog Manager',
        description: 'Catalog access only — no permission, role, or user management access',
        status: true,
      },
    });
  }

  const catalogPermIds = createdPermissions
    .filter((p) => ['Dashboard', 'Media', 'Category', 'Brand', 'Attribute', 'Product'].includes(p.groupName))
    .map((p) => p.id);

  await prisma.rolePermission.deleteMany({ where: { roleId: catalogRole.id } });
  await prisma.rolePermission.createMany({
    data: catalogPermIds.map((permissionId) => ({
      roleId: catalogRole.id,
      permissionId,
    })),
  });

  // Seed Super Administrator User
  const defaultPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let superAdminUser = await prisma.user.findUnique({
    where: { email: 'admin@trendsbird.com' },
  });

  if (!superAdminUser) {
    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: 'admin@trendsbird.com',
        password: hashedPassword,
        active: true,
        roleId: superAdminRole.id,
      },
    });
  }

  // Seed Limited User (Catalog Manager)
  let catalogUser = await prisma.user.findUnique({
    where: { email: 'catalog@trendsbird.com' },
  });

  if (!catalogUser) {
    catalogUser = await prisma.user.create({
      data: {
        name: 'Catalog Manager',
        email: 'catalog@trendsbird.com',
        password: hashedPassword,
        active: true,
        roleId: catalogRole.id,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('------------------------------------');
  console.log('Super Admin Credentials:');
  console.log('  Email: admin@trendsbird.com');
  console.log('  Password: Password123!');
  console.log('------------------------------------');
  console.log('Catalog Manager Credentials (Limited 403 test user):');
  console.log('  Email: catalog@trendsbird.com');
  console.log('  Password: Password123!');
  console.log('------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
