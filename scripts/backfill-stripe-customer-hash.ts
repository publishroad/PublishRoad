import "dotenv/config";
import { db } from "../src/lib/db";
import { decryptField, hashLookupValue } from "../src/lib/server-utils";

const BATCH_SIZE = 200;

async function main() {
  let cursorId: string | undefined;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const users = await db.user.findMany({
      where: {
        stripeCustomerId: { not: null },
        stripeCustomerHash: null,
      },
      select: {
        id: true,
        stripeCustomerId: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    if (users.length === 0) break;

    for (const user of users) {
      scanned += 1;
      cursorId = user.id;

      if (!user.stripeCustomerId) {
        skipped += 1;
        continue;
      }

      try {
        const customerId = decryptField(user.stripeCustomerId);
        const customerHash = hashLookupValue(customerId);

        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerHash: customerHash },
        });

        updated += 1;
      } catch (error) {
        skipped += 1;
        console.error("Skipping user due to stripeCustomerId decrypt failure", {
          userId: user.id,
          error,
        });
      }
    }
  }

  console.log("Stripe customer hash backfill complete", {
    scanned,
    updated,
    skipped,
  });
}

main()
  .catch((error) => {
    console.error("Stripe customer hash backfill failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
