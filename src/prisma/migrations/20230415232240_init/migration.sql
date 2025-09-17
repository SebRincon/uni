-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50),
    "description" VARCHAR(280),
    "age" TIMESTAMP(3),
    "username" VARCHAR(20) NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retweet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retweetedById" TEXT NOT NULL,
    "tweetOriginId" TEXT NOT NULL,

    CONSTRAINT "Retweet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_userFollows" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_userLikes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "_userFollows_AB_unique" ON "_userFollows"("A", "B");

-- CreateIndex
CREATE INDEX "_userFollows_B_index" ON "_userFollows"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_userLikes_AB_unique" ON "_userLikes"("A", "B");

-- CreateIndex
CREATE INDEX "_userLikes_B_index" ON "_userLikes"("B");

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retweet" ADD CONSTRAINT "Retweet_retweetedById_fkey" FOREIGN KEY ("retweetedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retweet" ADD CONSTRAINT "Retweet_tweetOriginId_fkey" FOREIGN KEY ("tweetOriginId") REFERENCES "Tweet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_userFollows" ADD CONSTRAINT "_userFollows_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_userFollows" ADD CONSTRAINT "_userFollows_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_userLikes" ADD CONSTRAINT "_userLikes_A_fkey" FOREIGN KEY ("A") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_userLikes" ADD CONSTRAINT "_userLikes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
