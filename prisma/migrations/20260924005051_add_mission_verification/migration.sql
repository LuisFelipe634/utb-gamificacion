-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "verificationKey" TEXT,
ADD COLUMN     "verificationValue" TEXT;

-- AlterTable
ALTER TABLE "student_missions" ADD COLUMN     "metadata" TEXT;
