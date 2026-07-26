/*
  Warnings:

  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otp_expires_at" TIMESTAMPTZ,
ALTER COLUMN "email" SET NOT NULL;
