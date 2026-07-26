-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('end_user', 'vendor', 'admin');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('draft', 'under_review', 'approved', 'rejected', 'changes_requested', 'suspended');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'under_review', 'approved', 'rejected', 'changes_requested', 'suspended');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'blocked', 'held', 'booked');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('draft', 'active', 'checked_out');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('jazzcash', 'easypaisa', 'card', 'bank_transfer');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'verifying', 'held_escrow', 'released', 'refunded', 'failed', 'disputed');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'paid');

-- CreateTable
CREATE TABLE "user" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" "UserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "oauth_provider" TEXT,
    "city" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "vendor_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "legal_business_name" TEXT NOT NULL,
    "cnic_or_reg_number_enc" BYTEA NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'draft',
    "commission_rate_override" DECIMAL(5,2),
    "payout_bank_details_enc" BYTEA,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "category" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "attribute_schema" JSONB NOT NULL,
    "default_budget_weight_pct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "vendor_listing" (
    "listing_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "requires_reverification" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "ai_eligibility_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_listing_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "pricing_tier" (
    "tier_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "min_capacity" INTEGER,
    "max_capacity" INTEGER,
    "base_price_paisa" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pricing_tier_pkey" PRIMARY KEY ("tier_id")
);

-- CreateTable
CREATE TABLE "calendar_availability" (
    "availability_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "hold_expires_at" TIMESTAMPTZ,
    "booking_id" UUID,

    CONSTRAINT "calendar_availability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateTable
CREATE TABLE "package" (
    "package_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "total_budget_paisa" BIGINT NOT NULL,
    "wedding_date" DATE,
    "guest_count" INTEGER,
    "status" "PackageStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_pkey" PRIMARY KEY ("package_id")
);

-- CreateTable
CREATE TABLE "package_line_item" (
    "line_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "package_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "listing_id" UUID,
    "tier_id" UUID,
    "allocated_budget_paisa" BIGINT NOT NULL,
    "actual_price_paisa" BIGINT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "rank_at_selection" INTEGER,
    "rationale_text" TEXT,

    CONSTRAINT "package_line_item_pkey" PRIMARY KEY ("line_item_id")
);

-- CreateTable
CREATE TABLE "booking" (
    "booking_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "package_id" UUID,
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "tier_id" UUID,
    "event_date" DATE NOT NULL,
    "guest_count" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'requested',
    "agreed_total_price_paisa" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "payment" (
    "payment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "milestone_label" TEXT NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "method" "PaymentMethod" NOT NULL,
    "gateway_txn_ref" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "scheduled_date" DATE NOT NULL,
    "captured_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "payout_ledger_entry" (
    "ledger_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "gross_amount_paisa" BIGINT NOT NULL,
    "commission_amount_paisa" BIGINT NOT NULL,
    "net_payout_paisa" BIGINT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "payout_ledger_entry_pkey" PRIMARY KEY ("ledger_id")
);

-- CreateTable
CREATE TABLE "review" (
    "review_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID,
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "is_verified_booking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_vendor_owner" ON "vendor"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "idx_listing_city_category_status" ON "vendor_listing"("city", "category_id", "status");

-- CreateIndex
CREATE INDEX "idx_listing_vendor" ON "vendor_listing"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_listing_attributes_gin" ON "vendor_listing" USING GIN ("attributes");

-- CreateIndex
CREATE INDEX "idx_tier_listing" ON "pricing_tier"("listing_id");

-- CreateIndex
CREATE INDEX "idx_availability_date_status" ON "calendar_availability"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_availability_listing_id_date_key" ON "calendar_availability"("listing_id", "date");

-- CreateIndex
CREATE INDEX "idx_package_user" ON "package"("user_id");

-- CreateIndex
CREATE INDEX "idx_line_item_package" ON "package_line_item"("package_id");

-- CreateIndex
CREATE INDEX "idx_booking_user" ON "booking"("user_id");

-- CreateIndex
CREATE INDEX "idx_booking_listing_date" ON "booking"("listing_id", "event_date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_txn_ref_key" ON "payment"("gateway_txn_ref");

-- CreateIndex
CREATE INDEX "idx_payment_booking" ON "payment"("booking_id");

-- CreateIndex
CREATE INDEX "idx_payment_status_scheduled" ON "payment"("status", "scheduled_date");

-- CreateIndex
CREATE INDEX "idx_ledger_vendor" ON "payout_ledger_entry"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_review_listing" ON "review"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_booking_id_user_id_key" ON "review"("booking_id", "user_id");

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_listing" ADD CONSTRAINT "vendor_listing_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_listing" ADD CONSTRAINT "vendor_listing_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_tier" ADD CONSTRAINT "pricing_tier_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "vendor_listing"("listing_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_availability" ADD CONSTRAINT "calendar_availability_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "vendor_listing"("listing_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_availability" ADD CONSTRAINT "calendar_availability_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package" ADD CONSTRAINT "package_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_line_item" ADD CONSTRAINT "package_line_item_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "package"("package_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_line_item" ADD CONSTRAINT "package_line_item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_line_item" ADD CONSTRAINT "package_line_item_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "vendor_listing"("listing_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_line_item" ADD CONSTRAINT "package_line_item_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "pricing_tier"("tier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "package"("package_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "vendor_listing"("listing_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "pricing_tier"("tier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_ledger_entry" ADD CONSTRAINT "payout_ledger_entry_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_ledger_entry" ADD CONSTRAINT "payout_ledger_entry_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "vendor_listing"("listing_id") ON DELETE RESTRICT ON UPDATE CASCADE;
