-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "hasAccount" BOOLEAN NOT NULL DEFAULT false,
    "hasConfigured" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tfa_secret" TEXT,
    CONSTRAINT "User_username_fkey" FOREIGN KEY ("username") REFERENCES "EmailRule" ("email") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("hasAccount", "password", "tfa_secret", "username") SELECT "hasAccount", "password", "tfa_secret", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
