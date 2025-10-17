#!/usr/bin/env bun
/**
 * Test Drizzle connection and schema
 */

import db from "../src/lib/db";
import { categories, transactions, reviewYears } from "../src/db/schema";
import { sql } from "drizzle-orm";

console.log("🧪 Testing Drizzle connection...\n");

try {
  // Test 1: Count categories
  const categoryCount = await db.select({ count: sql<number>`COUNT(*)` }).from(categories);
  console.log(`✅ Categories count: ${categoryCount[0].count}`);

  // Test 2: Count transactions
  const transactionCount = await db.select({ count: sql<number>`COUNT(*)` }).from(transactions);
  console.log(`✅ Transactions count: ${transactionCount[0].count}`);

  // Test 3: Query a view
  const yearsData = await db.select().from(reviewYears).limit(3);
  console.log(`✅ Review years view: ${yearsData.length} records found`);

  if (yearsData.length > 0) {
    console.log("\n📊 Sample year data:");
    console.table(yearsData);
  }

  console.log("\n✨ All tests passed! Drizzle is working correctly.");

} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
