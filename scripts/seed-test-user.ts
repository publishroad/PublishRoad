import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const email = "test@publishroad.com";
  const password = "Test@1234";

  const passwordHash = await bcrypt.hash(password, 12);

  // Find or create lifetime plan
  let lifetimePlan = await db.planConfig.findUnique({ where: { slug: "lifetime" } });
  if (!lifetimePlan) {
    lifetimePlan = await db.planConfig.create({
      data: {
        name: "Lifetime",
        slug: "lifetime",
        priceCents: 59900,
        credits: 30,
        billingType: "lifetime",
        isActive: true,
        sortOrder: 4,
      },
    });
    console.log("Created lifetime plan");
  } else {
    // Ensure credits is correct
    await db.planConfig.update({
      where: { id: lifetimePlan.id },
      data: { credits: 30 },
    });
  }

  // Upsert user
  const user = await db.user.upsert({
    where: { email },
    update: {
      passwordHash,
      planId: lifetimePlan.id,
      creditsRemaining: 30,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      name: "Test User",
      passwordHash,
      planId: lifetimePlan.id,
      creditsRemaining: 30,
      emailVerifiedAt: new Date(),
      authProvider: "email",
    },
  });

  console.log("✅ Test user created/updated:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Plan:     Lifetime (30 credits initial)`);
  console.log(`   User ID:  ${user.id}`);
}

main()
  .catch(console.error)
  .finally(() => (db as unknown as { $disconnect: () => Promise<void> }).$disconnect?.());
