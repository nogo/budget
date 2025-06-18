-- CreateTable
CREATE TABLE "templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "category_id" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "templates_type_idx" ON "templates"("type");
