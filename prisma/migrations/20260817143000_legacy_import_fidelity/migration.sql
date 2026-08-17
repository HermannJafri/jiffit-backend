-- Preserve source identifiers and malformed historical values without making
-- them actionable in live workflows.
ALTER TABLE `dashboard_users`
  ADD COLUMN `legacy_admin_id` INTEGER NULL,
  ADD UNIQUE INDEX `dashboard_users_legacy_admin_id_key`(`legacy_admin_id`);

ALTER TABLE `bookings`
  ADD COLUMN `legacy_order_id` INTEGER NULL,
  ADD COLUMN `legacy_raw_latitude` VARCHAR(50) NULL,
  ADD COLUMN `legacy_raw_longitude` VARCHAR(50) NULL,
  ADD COLUMN `legacy_raw_items` JSON NULL,
  ADD UNIQUE INDEX `bookings_legacy_order_id_key`(`legacy_order_id`);

ALTER TABLE `legacy_customer_addresses`
  ADD COLUMN `legacy_user_id` INTEGER NOT NULL,
  ADD INDEX `legacy_customer_addresses_legacy_user_id_idx`(`legacy_user_id`);

ALTER TABLE `legacy_booking_visits`
  DROP FOREIGN KEY `legacy_booking_visits_booking_id_fkey`;
ALTER TABLE `legacy_booking_visits`
  MODIFY `booking_id` INTEGER NULL,
  MODIFY `visit_date` DATE NULL,
  ADD COLUMN `legacy_order_id` INTEGER NOT NULL,
  ADD COLUMN `raw_visit_date` VARCHAR(30) NULL,
  ADD INDEX `legacy_booking_visits_legacy_order_id_idx`(`legacy_order_id`);
ALTER TABLE `legacy_booking_visits`
  ADD CONSTRAINT `legacy_booking_visits_booking_id_fkey`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `legacy_wallet_transactions`
  MODIFY `occurred_at` DATETIME(3) NULL,
  ADD COLUMN `raw_occurred_at` VARCHAR(30) NULL,
  ADD COLUMN `legacy_driver_id` INTEGER NULL,
  ADD INDEX `legacy_wallet_transactions_legacy_driver_id_idx`(`legacy_driver_id`);

ALTER TABLE `legacy_invoice_snapshots`
  DROP FOREIGN KEY `legacy_invoice_snapshots_booking_id_fkey`;
ALTER TABLE `legacy_invoice_snapshots`
  MODIFY `booking_id` INTEGER NULL,
  ADD COLUMN `legacy_order_id` INTEGER NULL,
  ADD COLUMN `raw_invoice_date` VARCHAR(30) NULL,
  ADD INDEX `legacy_invoice_snapshots_legacy_order_id_idx`(`legacy_order_id`);
ALTER TABLE `legacy_invoice_snapshots`
  ADD CONSTRAINT `legacy_invoice_snapshots_booking_id_fkey`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
