import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Users ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ims.dev' },
    update: {},
    create: { name: 'Admin User', email: 'admin@ims.dev', password: adminPassword, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'staff@ims.dev' },
    update: {},
    create: { name: 'Staff User', email: 'staff@ims.dev', password: staffPassword, role: 'STAFF' },
  });

  // --- Categories ---
  const categoryData = [
    { name: 'Electronics', description: 'Devices and gadgets' },
    { name: 'Office Supplies', description: 'Stationery and office essentials' },
    { name: 'Furniture', description: 'Office and home furniture' },
    { name: 'Groceries', description: 'Food and beverages' },
  ];
  const categories = [];
  for (const c of categoryData) {
    categories.push(
      await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c }),
    );
  }

  // --- Suppliers ---
  const supplierData = [
    { name: 'TechWorld Distributors', email: 'sales@techworld.com', phone: '+91-9000000001', address: 'Bengaluru, IN' },
    { name: 'OfficeMart Pvt Ltd', email: 'contact@officemart.com', phone: '+91-9000000002', address: 'Delhi, IN' },
    { name: 'HomeStyle Furnishings', email: 'hello@homestyle.com', phone: '+91-9000000003', address: 'Mumbai, IN' },
  ];
  const suppliers = [];
  for (const s of supplierData) {
    // Suppliers have no unique business key; create only if none with same name exists.
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    suppliers.push(existing ?? (await prisma.supplier.create({ data: s })));
  }

  // --- Products ---
  const products = [
    { sku: 'ELE-001', name: 'Wireless Mouse', price: 799, costPrice: 450, quantity: 120, reorderLevel: 20, cat: 0, sup: 0 },
    { sku: 'ELE-002', name: 'Mechanical Keyboard', price: 2999, costPrice: 1800, quantity: 8, reorderLevel: 15, cat: 0, sup: 0 },
    { sku: 'ELE-003', name: '27-inch Monitor', price: 14999, costPrice: 11000, quantity: 35, reorderLevel: 10, cat: 0, sup: 0 },
    { sku: 'OFF-001', name: 'A4 Paper Ream', price: 320, costPrice: 220, quantity: 500, reorderLevel: 100, cat: 1, sup: 1 },
    { sku: 'OFF-002', name: 'Ballpoint Pens (Box)', price: 150, costPrice: 90, quantity: 5, reorderLevel: 25, cat: 1, sup: 1 },
    { sku: 'FUR-001', name: 'Ergonomic Chair', price: 8999, costPrice: 6000, quantity: 18, reorderLevel: 5, cat: 2, sup: 2 },
    { sku: 'FUR-002', name: 'Standing Desk', price: 18999, costPrice: 14000, quantity: 3, reorderLevel: 5, cat: 2, sup: 2 },
    { sku: 'GRO-001', name: 'Instant Coffee Jar', price: 450, costPrice: 300, quantity: 60, reorderLevel: 20, cat: 3, sup: 1 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        categoryId: categories[p.cat].id,
        supplierId: suppliers[p.sup].id,
      },
    });
  }

  // --- A few stock movements for history ---
  const sampleProduct = await prisma.product.findUnique({ where: { sku: 'ELE-001' } });
  if (sampleProduct) {
    const count = await prisma.stockMovement.count({ where: { productId: sampleProduct.id } });
    if (count === 0) {
      await prisma.stockMovement.createMany({
        data: [
          { productId: sampleProduct.id, type: 'IN', quantity: 100, note: 'Initial stock', userId: admin.id },
          { productId: sampleProduct.id, type: 'OUT', quantity: 30, note: 'Sale order #1001', userId: admin.id },
          { productId: sampleProduct.id, type: 'IN', quantity: 50, note: 'Restock', userId: admin.id },
        ],
      });
    }
  }

  console.log('✅ Seed complete.');
  console.log('   Admin login: admin@ims.dev / admin123');
  console.log('   Staff login: staff@ims.dev / staff123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
