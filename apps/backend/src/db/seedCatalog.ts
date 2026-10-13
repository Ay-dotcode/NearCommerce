import { db } from "@/config/database";
import { seedDefaultCatalog } from "@/features/catalog/services/category.service";

// Adds any missing default categories and subcategories. Safe to run repeatedly.
(async () => {
  const result = await seedDefaultCatalog();
  console.log(
    `Default catalog: ${result.categoriesCreated} categories and ${result.subcategoriesCreated} subcategories added.`,
  );
  await db.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
