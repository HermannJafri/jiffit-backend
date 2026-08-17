ALTER TABLE `customers` ADD COLUMN `legacy_user_id` INTEGER NULL;
CREATE UNIQUE INDEX `customers_legacy_user_id_key` ON `customers`(`legacy_user_id`);

ALTER TABLE `heroes` ADD COLUMN `legacy_user_id` INTEGER NULL;
CREATE UNIQUE INDEX `heroes_legacy_user_id_key` ON `heroes`(`legacy_user_id`);
