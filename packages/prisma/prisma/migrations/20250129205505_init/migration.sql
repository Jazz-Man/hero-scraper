-- CreateTable
CREATE TABLE "Zone" (
    "zoneId" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "EmailRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "forwardTo" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    CONSTRAINT "EmailRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("zoneId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "hasAccount" BOOLEAN NOT NULL DEFAULT false,
    "tfa_secret" TEXT,
    CONSTRAINT "User_username_fkey" FOREIGN KEY ("username") REFERENCES "EmailRule" ("email") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCookies" (
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'freebitco.in',
    "path" TEXT NOT NULL DEFAULT '/',
    "expires" DATETIME,
    "httpOnly" BOOLEAN NOT NULL DEFAULT false,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "sameParty" BOOLEAN NOT NULL DEFAULT false,
    "sameSite" TEXT NOT NULL DEFAULT 'None',
    "userUsername" TEXT NOT NULL,

    PRIMARY KEY ("name", "domain", "userUsername"),
    CONSTRAINT "UserCookies_userUsername_fkey" FOREIGN KEY ("userUsername") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zoneId_key" ON "Zone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_domain_key" ON "Zone"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRule_id_key" ON "EmailRule"("id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRule_email_key" ON "EmailRule"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
