CREATE UNIQUE INDEX "conversion_customer_ref_unique"
  ON "Conversion"("customerRef")
  WHERE "customerRef" IS NOT NULL;
