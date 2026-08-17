-- CreateTable
CREATE TABLE `role_definitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_definitions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(5) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `states_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `booking_cutoff_time` VARCHAR(5) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cities_state_id_idx`(`state_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hubs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `city_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `latitude` VARCHAR(20) NOT NULL,
    `longitude` VARCHAR(20) NOT NULL,
    `checkin_radius_meters` INTEGER NOT NULL DEFAULT 500,
    `service_radius_meters` INTEGER NOT NULL DEFAULT 10000,
    `manager_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hubs_city_id_idx`(`city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(15) NULL,
    `alternate_phone` VARCHAR(15) NULL,
    `employee_code` VARCHAR(20) NULL,
    `date_of_birth` DATE NULL,
    `profile_photo_url` VARCHAR(500) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_ifsc` VARCHAR(15) NULL,
    `pan_card_url` VARCHAR(500) NULL,
    `aadhaar_card_url` VARCHAR(500) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'OPERATIONS',
    `city_id` INTEGER NULL,
    `hub_id` INTEGER NULL,
    `designation` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `monthly_salary` DECIMAL(10, 2) NULL,
    `address` TEXT NULL,
    `joining_date` DATE NULL,
    `end_date` DATE NULL,
    `created_by_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `must_reset_password` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dashboard_users_username_key`(`username`),
    UNIQUE INDEX `dashboard_users_email_key`(`email`),
    UNIQUE INDEX `dashboard_users_phone_key`(`phone`),
    UNIQUE INDEX `dashboard_users_employee_code_key`(`employee_code`),
    INDEX `dashboard_users_city_id_idx`(`city_id`),
    INDEX `dashboard_users_hub_id_idx`(`hub_id`),
    INDEX `dashboard_users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_user_city_scopes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dashboard_user_id` INTEGER NOT NULL,
    `city_id` INTEGER NOT NULL,

    INDEX `dashboard_user_city_scopes_city_id_idx`(`city_id`),
    UNIQUE INDEX `dashboard_user_city_scopes_dashboard_user_id_city_id_key`(`dashboard_user_id`, `city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_user_hub_scopes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dashboard_user_id` INTEGER NOT NULL,
    `hub_id` INTEGER NOT NULL,

    INDEX `dashboard_user_hub_scopes_hub_id_idx`(`hub_id`),
    UNIQUE INDEX `dashboard_user_hub_scopes_dashboard_user_id_hub_id_key`(`dashboard_user_id`, `hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `heroes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(15) NOT NULL,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `date_of_birth` DATE NULL,
    `profile_photo_url` VARCHAR(500) NULL,
    `address_line1` VARCHAR(255) NULL,
    `address_line2` VARCHAR(255) NULL,
    `pincode` VARCHAR(10) NULL,
    `home_latitude` DECIMAL(10, 8) NULL,
    `home_longitude` DECIMAL(11, 8) NULL,
    `aadhaar_number` VARCHAR(20) NULL,
    `pan_number` VARCHAR(20) NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(15) NULL,
    `whatsapp_opt_in` BOOLEAN NOT NULL DEFAULT true,
    `bank_account_name` VARCHAR(100) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_ifsc` VARCHAR(15) NULL,
    `gst_no` VARCHAR(15) NULL,
    `bank_details_needs_review` BOOLEAN NOT NULL DEFAULT false,
    `city_id` INTEGER NULL,
    `hub_id` INTEGER NULL,
    `status` ENUM('INCOMPLETE', 'PENDING_APPROVAL', 'VERIFIED', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'INCOMPLETE',
    `duty_status` ENUM('OFFLINE', 'ONLINE', 'BUSY') NOT NULL DEFAULT 'OFFLINE',
    `connectivity_status` ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    `current_lat` DECIMAL(10, 8) NULL,
    `current_lng` DECIMAL(11, 8) NULL,
    `current_location_updated_at` DATETIME(3) NULL,
    `verified_at` DATETIME(3) NULL,
    `verified_by_id` INTEGER NULL,
    `rejection_reason` TEXT NULL,
    `created_by_id` INTEGER NULL,
    `needs_spot_check` BOOLEAN NOT NULL DEFAULT false,
    `father_name` VARCHAR(100) NULL,
    `alternate_phone` VARCHAR(15) NULL,
    `language` ENUM('ENGLISH', 'HINDI', 'HINGLISH') NULL,
    `work_type` ENUM('HELPER', 'BIKE_RIDER') NULL,
    `vehicle_type` ENUM('CYCLE', 'BIKE', 'ELECTRIC_BIKE', 'NO_VEHICLE', 'COMPANY_EV') NULL,
    `earnings_type` ENUM('SALARY', 'COMMISSION') NULL,
    `onboarding_source` ENUM('MOBILE_APP', 'DASHBOARD', 'REFERRAL', 'WALK_IN') NULL,
    `upi_id` VARCHAR(100) NULL,
    `referral_code` VARCHAR(20) NULL,
    `referred_by_hero_id` INTEGER NULL,
    `is_blacklisted` BOOLEAN NOT NULL DEFAULT false,
    `blacklist_reason` TEXT NULL,
    `blacklisted_at` DATETIME(3) NULL,
    `device_token` VARCHAR(500) NULL,
    `location_permission` BOOLEAN NOT NULL DEFAULT false,
    `rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    `total_ratings` INTEGER NOT NULL DEFAULT 0,
    `total_bookings` INTEGER NOT NULL DEFAULT 0,
    `monthly_salary` DECIMAL(10, 2) NULL,
    `commission_percentage` DECIMAL(5, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `delete_requested_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `referral_bonus_paid_at` DATETIME(3) NULL,

    UNIQUE INDEX `heroes_phone_key`(`phone`),
    UNIQUE INDEX `heroes_email_key`(`email`),
    UNIQUE INDEX `heroes_alternate_phone_key`(`alternate_phone`),
    UNIQUE INDEX `heroes_referral_code_key`(`referral_code`),
    INDEX `heroes_phone_idx`(`phone`),
    INDEX `heroes_city_id_idx`(`city_id`),
    INDEX `heroes_hub_id_idx`(`hub_id`),
    INDEX `heroes_status_idx`(`status`),
    INDEX `heroes_is_blacklisted_idx`(`is_blacklisted`),
    INDEX `heroes_referral_code_idx`(`referral_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `installation_id` VARCHAR(100) NOT NULL,
    `hero_id` INTEGER NOT NULL,
    `fcm_token` VARCHAR(500) NOT NULL,
    `platform` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hero_devices_installation_id_key`(`installation_id`),
    UNIQUE INDEX `hero_devices_fcm_token_key`(`fcm_token`),
    INDEX `hero_devices_hero_id_idx`(`hero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `type` ENUM('AADHAR', 'PAN', 'DRIVING_LICENSE', 'SELFIE', 'OTHER') NOT NULL,
    `number` VARCHAR(50) NULL,
    `front_url` VARCHAR(500) NULL,
    `back_url` VARCHAR(500) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hero_documents_hero_id_idx`(`hero_id`),
    UNIQUE INDEX `hero_documents_hero_id_type_key`(`hero_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `hub_id` INTEGER NOT NULL,
    `selfie_url` VARCHAR(500) NULL,
    `check_out_selfie_url` VARCHAR(500) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `distance_meters` INTEGER NOT NULL,
    `checked_in_at` DATETIME(3) NOT NULL,
    `checked_out_at` DATETIME(3) NULL,
    `checkout_reason` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_attendance_hero_id_idx`(`hero_id`),
    INDEX `hero_attendance_hub_id_idx`(`hub_id`),
    INDEX `hero_attendance_checked_in_at_idx`(`checked_in_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_connectivity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `status` ENUM('ONLINE', 'OFFLINE') NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_connectivity_logs_hero_id_occurred_at_idx`(`hero_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_latest_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `attendance_id` INTEGER NULL,
    `booking_id` INTEGER NULL,
    `participant_role` VARCHAR(30) NULL,
    `mode` ENUM('DUTY', 'ACTIVE_BOOKING') NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `accuracy_meters` DECIMAL(8, 2) NULL,
    `speed_meters_per_second` DECIMAL(8, 2) NULL,
    `heading_degrees` DECIMAL(6, 2) NULL,
    `altitude_meters` DECIMAL(10, 2) NULL,
    `is_mocked` BOOLEAN NOT NULL DEFAULT false,
    `source` ENUM('REST', 'SOCKET', 'FOREGROUND_SERVICE', 'ACTIVE_ROUTE') NOT NULL,
    `origin` ENUM('GPS', 'NETWORK', 'FUSED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `device_timestamp` DATETIME(3) NULL,
    `server_received_at` DATETIME(3) NOT NULL,
    `location_updated_at` DATETIME(3) NOT NULL,
    `app_version` VARCHAR(40) NULL,
    `device_id_hash` VARCHAR(128) NULL,
    `permission_state` VARCHAR(40) NULL,
    `provider_state` VARCHAR(40) NULL,
    `connectivity_state` VARCHAR(40) NULL,
    `stale_after_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hero_latest_locations_hero_id_key`(`hero_id`),
    INDEX `hero_latest_locations_mode_idx`(`mode`),
    INDEX `hero_latest_locations_booking_id_idx`(`booking_id`),
    INDEX `hero_latest_locations_attendance_id_idx`(`attendance_id`),
    INDEX `hero_latest_locations_server_received_at_idx`(`server_received_at`),
    INDEX `hero_latest_locations_location_updated_at_idx`(`location_updated_at`),
    INDEX `hero_latest_locations_stale_after_at_idx`(`stale_after_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_location_access_audits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dashboard_user_id` INTEGER NOT NULL,
    `hero_id` INTEGER NOT NULL,
    `action` VARCHAR(30) NOT NULL,
    `result` VARCHAR(30) NOT NULL,
    `reason_code` VARCHAR(60) NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_location_access_audits_dashboard_user_id_occurred_at_idx`(`dashboard_user_id`, `occurred_at`),
    INDEX `hero_location_access_audits_hero_id_occurred_at_idx`(`hero_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_skills_hero_id_idx`(`hero_id`),
    INDEX `hero_skills_service_id_idx`(`service_id`),
    UNIQUE INDEX `hero_skills_hero_id_service_id_key`(`hero_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_otps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(15) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_otps_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_refresh_tokens_hero_id_idx`(`hero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `job_roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_job_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `job_role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_job_roles_job_role_id_idx`(`job_role_id`),
    UNIQUE INDEX `hero_job_roles_hero_id_job_role_id_key`(`hero_id`, `job_role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `parent_id` INTEGER NULL,
    `icon_url` VARCHAR(500) NULL,
    `banner_image_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_groups_slug_key`(`slug`),
    INDEX `service_groups_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `icon_url` VARCHAR(500) NULL,
    `banner_image_url` VARCHAR(500) NULL,
    `days` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `search_tags` TEXT NULL,
    `price` DECIMAL(10, 2) NULL,
    `mrp` DECIMAL(10, 2) NULL,
    `tax_mode` VARCHAR(20) NOT NULL DEFAULT 'NONE',
    `tax_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `image_url` VARCHAR(500) NULL,
    `detail_image_url` VARCHAR(500) NULL,
    `detail_content_json` TEXT NULL,
    `duration` INTEGER NULL,
    `worker_count` INTEGER NULL,
    `service_group_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `services_category_id_idx`(`category_id`),
    UNIQUE INDEX `services_category_id_slug_key`(`category_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hub_service_availability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hub_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hub_service_availability_hub_id_idx`(`hub_id`),
    INDEX `hub_service_availability_service_id_idx`(`service_id`),
    UNIQUE INDEX `hub_service_availability_hub_id_service_id_key`(`hub_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 60,
    `mrp` DECIMAL(10, 2) NULL,
    `single_price` DECIMAL(10, 2) NULL,
    `price_1_month` DECIMAL(10, 2) NULL,
    `price_3_month` DECIMAL(10, 2) NULL,
    `price_6_month` DECIMAL(10, 2) NULL,
    `price_12_month` DECIMAL(10, 2) NULL,
    `visits_per_month` INTEGER NOT NULL DEFAULT 1,
    `validity_days` INTEGER NULL,
    `total_visits` INTEGER NULL,
    `price_per_visit` DECIMAL(10, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_variants_service_id_idx`(`service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(15) NOT NULL,
    `alternate_phone` VARCHAR(15) NULL,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `date_of_birth` DATE NULL,
    `profile_photo_url` VARCHAR(500) NULL,
    `whatsapp_opt_in` BOOLEAN NOT NULL DEFAULT true,
    `device_token` VARCHAR(500) NULL,
    `referral_code` VARCHAR(20) NULL,
    `referred_by_phone` VARCHAR(15) NULL,
    `referral_bonus_paid_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_phone_key`(`phone`),
    UNIQUE INDEX `customers_email_key`(`email`),
    UNIQUE INDEX `customers_referral_code_key`(`referral_code`),
    INDEX `customers_phone_idx`(`phone`),
    INDEX `customers_name_idx`(`name`),
    INDEX `customers_email_idx`(`email`),
    INDEX `customers_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_otps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(15) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_otps_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_challenges` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `identifier` VARCHAR(32) NOT NULL,
    `context` VARCHAR(20) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `verification_attempts` INTEGER NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(3) NULL,
    `invalidated_at` DATETIME(3) NULL,
    `request_ip_hash` CHAR(64) NULL,
    `device_hash` CHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `otp_challenges_identifier_context_created_at_idx`(`identifier`, `context`, `created_at`),
    INDEX `otp_challenges_identifier_context_consumed_at_invalidated_at_idx`(`identifier`, `context`, `consumed_at`, `invalidated_at`, `expires_at`),
    INDEX `otp_challenges_expires_at_idx`(`expires_at`),
    INDEX `otp_challenges_consumed_at_expires_at_idx`(`consumed_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_security_states` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scope_type` VARCHAR(12) NOT NULL,
    `scope_key` VARCHAR(64) NOT NULL,
    `context` VARCHAR(20) NOT NULL,
    `request_count` INTEGER NOT NULL DEFAULT 0,
    `window_started_at` DATETIME(3) NOT NULL,
    `cooldown_until` DATETIME(3) NULL,
    `failed_attempts` INTEGER NOT NULL DEFAULT 0,
    `lockout_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `otp_security_states_context_cooldown_until_idx`(`context`, `cooldown_until`),
    INDEX `otp_security_states_context_lockout_until_idx`(`context`, `lockout_until`),
    INDEX `otp_security_states_window_started_at_idx`(`window_started_at`),
    UNIQUE INDEX `otp_security_states_scope_type_scope_key_context_key`(`scope_type`, `scope_key`, `context`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_refresh_tokens_customer_id_idx`(`customer_id`),
    INDEX `customer_refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `from_time` VARCHAR(5) NOT NULL,
    `to_time` VARCHAR(5) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `time_slots_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `label` VARCHAR(50) NOT NULL DEFAULT 'Home',
    `address_line1` VARCHAR(255) NOT NULL,
    `address_line2` VARCHAR(255) NULL,
    `city_id` INTEGER NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_addresses_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_no` VARCHAR(30) NOT NULL,
    `customer_id` INTEGER NULL,
    `customer_address_id` INTEGER NULL,
    `city_id` INTEGER NOT NULL,
    `booked_by_id` INTEGER NULL,
    `assigned_hero_id` INTEGER NULL,
    `partner_hero_id` INTEGER NULL,
    `service_category_id` INTEGER NULL,
    `time_slot_id` INTEGER NULL,
    `booking_type` ENUM('SINGLE', 'SUBSCRIPTION') NOT NULL DEFAULT 'SINGLE',
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'ON_HOLD', 'LEGACY_ARCHIVED') NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    `idempotency_key` VARCHAR(100) NULL,
    `idempotency_scope` VARCHAR(100) NULL,
    `request_fingerprint` CHAR(64) NULL,
    `creation_source` VARCHAR(30) NOT NULL DEFAULT 'LEGACY',
    `legacy_original_status` VARCHAR(30) NULL,
    `legacy_assigned_hero_name` VARCHAR(150) NULL,
    `legacy_assigned_hero_id` INTEGER NULL,
    `legacy_time_slot_label` VARCHAR(30) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `required_worker_count` INTEGER NOT NULL DEFAULT 1,
    `worker_plan_version` INTEGER NOT NULL DEFAULT 1,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(15) NOT NULL,
    `customer_alt_phone` VARCHAR(15) NULL,
    `customer_email` VARCHAR(100) NULL,
    `service_address` TEXT NOT NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `scheduled_date` DATE NULL,
    `scheduled_from_time` VARCHAR(5) NULL,
    `scheduled_to_time` VARCHAR(5) NULL,
    `slot_start_at` DATETIME(3) NULL,
    `slot_end_at` DATETIME(3) NULL,
    `service_duration_minutes` INTEGER NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `payable_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `advance_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `final_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `coins_redeemed` INTEGER NOT NULL DEFAULT 0,
    `coins_discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `overtime_fee_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `overtime_minutes` INTEGER NOT NULL DEFAULT 0,
    `coupon_code` VARCHAR(50) NULL,
    `payment_status` ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `payment_method` VARCHAR(50) NULL,
    `cash_settled` BOOLEAN NOT NULL DEFAULT false,
    `cash_settled_at` DATETIME(3) NULL,
    `cash_settled_by_id` INTEGER NULL,
    `customer_notes` TEXT NULL,
    `admin_notes` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `before_photo_url` VARCHAR(500) NULL,
    `after_photo_url` VARCHAR(500) NULL,
    `start_otp` VARCHAR(10) NULL,
    `start_otp_verified_at` DATETIME(3) NULL,
    `payment_requested_at` DATETIME(3) NULL,
    `auto_dispatch_attempts` INTEGER NOT NULL DEFAULT 0,
    `is_package_purchase` BOOLEAN NOT NULL DEFAULT false,
    `customer_service_package_id` INTEGER NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `bookings_booking_no_key`(`booking_no`),
    INDEX `bookings_city_id_idx`(`city_id`),
    INDEX `bookings_status_idx`(`status`),
    INDEX `bookings_customer_id_idx`(`customer_id`),
    INDEX `bookings_assigned_hero_id_idx`(`assigned_hero_id`),
    INDEX `bookings_partner_hero_id_idx`(`partner_hero_id`),
    INDEX `bookings_scheduled_date_idx`(`scheduled_date`),
    INDEX `bookings_slot_start_at_idx`(`slot_start_at`),
    INDEX `bookings_slot_end_at_idx`(`slot_end_at`),
    INDEX `bookings_created_at_idx`(`created_at`),
    INDEX `bookings_is_package_purchase_idx`(`is_package_purchase`),
    INDEX `bookings_customer_service_package_id_idx`(`customer_service_package_id`),
    INDEX `bookings_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `bookings_idempotency_scope_idempotency_key_key`(`idempotency_scope`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_booking_visits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `source_task_id` INTEGER NOT NULL,
    `visit_date` DATE NOT NULL,
    `status` ENUM('COMPLETED', 'CANCELLED', 'FAILED', 'CONFIRMED', 'IN_PROGRESS', 'UNKNOWN') NOT NULL,
    `raw_status` VARCHAR(30) NOT NULL,
    `trans_type` VARCHAR(10) NULL,
    `su_type` VARCHAR(10) NULL,
    `legacy_driver_id` INTEGER NULL,
    `matched_hero_id` INTEGER NULL,
    `task_description` VARCHAR(255) NULL,
    `is_historical` BOOLEAN NOT NULL DEFAULT true,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `legacy_booking_visits_source_task_id_key`(`source_task_id`),
    INDEX `legacy_booking_visits_booking_id_idx`(`booking_id`),
    INDEX `legacy_booking_visits_source_task_id_idx`(`source_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_customer_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NULL,
    `raw_address_text` TEXT NOT NULL,
    `raw_add_type` VARCHAR(200) NULL,
    `raw_city` VARCHAR(255) NULL,
    `raw_pincode` VARCHAR(200) NULL,
    `raw_lat` VARCHAR(50) NULL,
    `raw_lng` VARCHAR(50) NULL,
    `source_address_id` INTEGER NOT NULL,
    `source_created_at` DATETIME(3) NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `legacy_customer_addresses_source_address_id_key`(`source_address_id`),
    INDEX `legacy_customer_addresses_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NULL,
    `attributed_hero_id` INTEGER NULL,
    `source_trn_id` INTEGER NOT NULL,
    `trn_type` ENUM('RECEIPT', 'CHARGE', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL,
    `action` VARCHAR(2) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `legacy_order_id` INTEGER NULL,
    `legacy_task_id` INTEGER NULL,
    `was_soft_deleted` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `legacy_wallet_transactions_source_trn_id_key`(`source_trn_id`),
    INDEX `legacy_wallet_transactions_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_content_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content_type` ENUM('BANNER', 'BLOG_POST', 'PAGE', 'FAQ', 'TESTIMONIAL', 'CONTACT_MESSAGE') NOT NULL,
    `title` VARCHAR(255) NULL,
    `body` TEXT NULL,
    `raw_fields` JSON NOT NULL,
    `source_table` VARCHAR(30) NOT NULL,
    `source_id` INTEGER NOT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_content_items_content_type_idx`(`content_type`),
    UNIQUE INDEX `legacy_content_items_source_table_source_id_key`(`source_table`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_invoice_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `source_invoice_id` INTEGER NOT NULL,
    `legacy_invoice_number` VARCHAR(50) NULL,
    `sub_total` DECIMAL(11, 2) NOT NULL,
    `discount_total` DECIMAL(10, 2) NOT NULL,
    `discounted_total` DECIMAL(10, 2) NOT NULL,
    `gst_amount` DECIMAL(11, 2) NOT NULL,
    `payable_total` DECIMAL(10, 2) NOT NULL,
    `total_paid` DECIMAL(10, 2) NOT NULL,
    `payment_mode` VARCHAR(30) NULL,
    `pay_ref` VARCHAR(255) NULL,
    `invoice_date` DATE NULL,
    `billing_name` VARCHAR(255) NULL,
    `billing_address` TEXT NULL,
    `raw_items` JSON NULL,
    `raw_activity_log` JSON NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `legacy_invoice_snapshots_source_invoice_id_key`(`source_invoice_id`),
    INDEX `legacy_invoice_snapshots_booking_id_idx`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_dispatches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `scheduled_start_at` DATETIME(3) NOT NULL,
    `dispatch_state` ENUM('PLANNED', 'PREFLIGHT_READY', 'OFFER_PENDING', 'RETRY_WAIT', 'HERO_ACCEPTED', 'TEAM_INCOMPLETE', 'TEAM_READY', 'ESCALATED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `dispatch_release_at` DATETIME(3) NOT NULL,
    `next_attempt_at` DATETIME(3) NULL,
    `current_offer_attempt_id` INTEGER NULL,
    `current_candidate_hero_id` INTEGER NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `escalated_at` DATETIME(3) NULL,
    `failure_code` VARCHAR(80) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `lease_owner` VARCHAR(100) NULL,
    `lease_expires_at` DATETIME(3) NULL,
    `reminder_at` DATETIME(3) NOT NULL,
    `reminder_sent_at` DATETIME(3) NULL,
    `preflighted_at` DATETIME(3) NULL,
    `candidate_count` INTEGER NOT NULL DEFAULT 0,
    `best_eta_seconds` INTEGER NULL,
    `best_distance_meters` INTEGER NULL,
    `best_origin_source` VARCHAR(40) NULL,
    `best_location_freshness_seconds` INTEGER NULL,
    `late_risk` BOOLEAN NOT NULL DEFAULT false,
    `shadow_mode` BOOLEAN NOT NULL DEFAULT true,
    `manual_override` BOOLEAN NOT NULL DEFAULT false,
    `override_reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_dispatches_booking_id_key`(`booking_id`),
    UNIQUE INDEX `booking_dispatches_current_offer_attempt_id_key`(`current_offer_attempt_id`),
    INDEX `booking_dispatch_state_release_idx`(`dispatch_state`, `dispatch_release_at`),
    INDEX `booking_dispatch_state_next_idx`(`dispatch_state`, `next_attempt_at`),
    INDEX `booking_dispatch_lease_idx`(`lease_expires_at`),
    INDEX `booking_dispatch_reminder_idx`(`reminder_at`, `reminder_sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_dispatch_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispatch_id` INTEGER NOT NULL,
    `slot_number` INTEGER NOT NULL,
    `role` ENUM('PRIMARY', 'HELPER', 'RIDER', 'SPECIALIST') NOT NULL,
    `required_service_id` INTEGER NULL,
    `participant_state` ENUM('PLANNED', 'OFFER_PENDING', 'ACCEPTED', 'RETRY_WAIT', 'ESCALATED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `accepted_hero_id` INTEGER NULL,
    `current_offer_attempt_id` INTEGER NULL,
    `route_eta_seconds` INTEGER NULL,
    `distance_meters` INTEGER NULL,
    `ready_at` DATETIME(3) NULL,
    `reminder_sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_dispatch_participants_current_offer_attempt_id_key`(`current_offer_attempt_id`),
    INDEX `dispatch_participants_hero_state_idx`(`accepted_hero_id`, `participant_state`),
    INDEX `dispatch_participants_state_idx`(`dispatch_id`, `participant_state`),
    UNIQUE INDEX `dispatch_participants_slot_key`(`dispatch_id`, `slot_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_offer_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `dispatch_id` INTEGER NOT NULL,
    `participant_slot_id` INTEGER NOT NULL,
    `hero_id` INTEGER NOT NULL,
    `role` ENUM('PRIMARY', 'HELPER', 'RIDER', 'SPECIALIST') NOT NULL,
    `attempt_number` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `active_key` VARCHAR(100) NULL,
    `offer_release_at` DATETIME(3) NOT NULL,
    `offer_expires_at` DATETIME(3) NOT NULL,
    `delivered_at` DATETIME(3) NULL,
    `accepted_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `expired_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `failure_code` VARCHAR(80) NULL,
    `event_id` VARCHAR(100) NOT NULL,
    `eta_seconds` INTEGER NULL,
    `distance_meters` INTEGER NULL,
    `origin_source` VARCHAR(40) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_offer_attempts_active_key_key`(`active_key`),
    UNIQUE INDEX `booking_offer_attempts_event_id_key`(`event_id`),
    INDEX `offer_attempt_booking_state_idx`(`booking_id`, `status`),
    INDEX `offer_attempt_dispatch_state_idx`(`dispatch_id`, `status`),
    INDEX `offer_attempt_expiry_state_idx`(`offer_expires_at`, `status`),
    INDEX `offer_attempt_hero_state_idx`(`hero_id`, `status`),
    UNIQUE INDEX `offer_attempt_slot_number_key`(`participant_slot_id`, `attempt_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_outbox_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` VARCHAR(100) NOT NULL,
    `aggregate_type` VARCHAR(40) NOT NULL,
    `aggregate_id` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(80) NOT NULL,
    `payload_version` INTEGER NOT NULL DEFAULT 1,
    `payload` JSON NOT NULL,
    `state` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `lease_owner` VARCHAR(100) NULL,
    `lease_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dispatch_outbox_events_event_id_key`(`event_id`),
    INDEX `dispatch_outbox_due_idx`(`state`, `available_at`),
    INDEX `dispatch_outbox_aggregate_idx`(`aggregate_type`, `aggregate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `service_id` INTEGER NULL,
    `service_variant_id` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_items_booking_id_idx`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_service_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `booking_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `service_variant_id` INTEGER NULL,
    `package_name` VARCHAR(150) NOT NULL,
    `total_visits` INTEGER NOT NULL,
    `used_visits` INTEGER NOT NULL DEFAULT 0,
    `validity_days` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `preferred_from_time` VARCHAR(5) NULL,
    `preferred_to_time` VARCHAR(5) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `cancelled_at` DATETIME(3) NULL,
    `cancelled_by_type` VARCHAR(20) NULL,
    `cancelled_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_service_packages_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `customer_service_packages_booking_id_idx`(`booking_id`),
    INDEX `customer_service_packages_service_id_idx`(`service_id`),
    INDEX `customer_service_packages_service_variant_id_idx`(`service_variant_id`),
    INDEX `customer_service_packages_end_date_idx`(`end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `from_status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'ON_HOLD', 'LEGACY_ARCHIVED') NULL,
    `to_status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'ON_HOLD', 'LEGACY_ARCHIVED') NOT NULL,
    `message` TEXT NULL,
    `changed_by_user_id` INTEGER NULL,
    `changed_by_hero_id` INTEGER NULL,
    `actor_type` VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    `actor_id` INTEGER NULL,
    `source` VARCHAR(30) NOT NULL DEFAULT 'LEGACY',
    `reason_code` VARCHAR(50) NULL,
    `reason_text` TEXT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_status_history_booking_id_idx`(`booking_id`),
    INDEX `booking_status_history_created_at_idx`(`created_at`),
    INDEX `booking_status_history_booking_id_created_at_idx`(`booking_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `hero_id` INTEGER NOT NULL,
    `assigned_by_id` INTEGER NULL,
    `status` ENUM('ASSIGNED', 'ACCEPTED', 'REJECTED', 'STARTED', 'COMPLETED', 'CANCELLED', 'REASSIGNED') NOT NULL DEFAULT 'ASSIGNED',
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accepted_at` DATETIME(3) NULL,
    `accepted_from_lat` DECIMAL(10, 8) NULL,
    `accepted_from_lng` DECIMAL(11, 8) NULL,
    `arrived_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `hero_notes` TEXT NULL,
    `commission_rate_applied` DECIMAL(5, 2) NULL,
    `commission_amount` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `booking_assignments_booking_id_idx`(`booking_id`),
    INDEX `booking_assignments_hero_id_idx`(`hero_id`),
    INDEX `booking_assignments_status_idx`(`status`),
    UNIQUE INDEX `booking_assignments_booking_id_hero_id_key`(`booking_id`, `hero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_group_capacity_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_group_id` INTEGER NOT NULL,
    `hub_id` INTEGER NOT NULL,
    `plan_date` DATE NOT NULL,
    `default_buffer_minutes` INTEGER NOT NULL DEFAULT 10,
    `max_bookings_override` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `created_by_id` INTEGER NULL,
    `updated_by_id` INTEGER NULL,
    `published_by_id` INTEGER NULL,
    `published_at` DATETIME(3) NULL,
    `locked_by_id` INTEGER NULL,
    `locked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sg_capacity_plans_hub_date_status_idx`(`hub_id`, `plan_date`, `status`),
    INDEX `sg_capacity_plans_group_date_status_idx`(`service_group_id`, `plan_date`, `status`),
    UNIQUE INDEX `sg_capacity_plans_group_hub_date_key`(`service_group_id`, `hub_id`, `plan_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `capacity_plan_shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `capacity_plan_id` INTEGER NOT NULL,
    `shift_type` ENUM('MORNING', 'GENERAL') NOT NULL,
    `shift_start_time` VARCHAR(5) NOT NULL,
    `shift_end_time` VARCHAR(5) NOT NULL,
    `hero_count` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `capacity_shifts_type_times_idx`(`shift_type`, `shift_start_time`, `shift_end_time`),
    UNIQUE INDEX `capacity_plan_shifts_capacity_plan_id_shift_type_key`(`capacity_plan_id`, `shift_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_group_route_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `capacity_plan_shift_id` INTEGER NOT NULL,
    `route_line_number` INTEGER NOT NULL,
    `assigned_hero_id` INTEGER NULL,
    `status` ENUM('OPEN', 'ASSIGNED', 'AT_RISK', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `route_lines_shift_status_idx`(`capacity_plan_shift_id`, `status`),
    INDEX `route_lines_hero_status_idx`(`assigned_hero_id`, `status`),
    UNIQUE INDEX `route_lines_shift_number_key`(`capacity_plan_shift_id`, `route_line_number`),
    UNIQUE INDEX `route_lines_shift_hero_key`(`capacity_plan_shift_id`, `assigned_hero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_route_reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `route_line_id` INTEGER NOT NULL,
    `service_group_id` INTEGER NULL,
    `capacity_unit` INTEGER NOT NULL,
    `role` ENUM('PRIMARY', 'SUPPORT') NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'SUPERSEDED') NOT NULL DEFAULT 'ACTIVE',
    `slot_start_at` DATETIME(3) NOT NULL,
    `slot_end_at` DATETIME(3) NOT NULL,
    `service_duration_minutes` INTEGER NOT NULL,
    `travel_eta_minutes` INTEGER NULL,
    `buffer_minutes` INTEGER NOT NULL,
    `released_at` DATETIME(3) NULL,
    `release_reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `route_reservations_line_status_times_idx`(`route_line_id`, `status`, `slot_start_at`, `slot_end_at`),
    INDEX `route_reservations_booking_status_idx`(`booking_id`, `status`),
    UNIQUE INDEX `route_reservations_booking_group_unit_key`(`booking_id`, `service_group_id`, `capacity_unit`),
    UNIQUE INDEX `route_reservations_booking_group_line_key`(`booking_id`, `service_group_id`, `route_line_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `hero_id` INTEGER NOT NULL,
    `invited_by_hero_id` INTEGER NOT NULL,
    `request_id` INTEGER NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_team_members_request_id_key`(`request_id`),
    INDEX `booking_team_members_booking_id_status_idx`(`booking_id`, `status`),
    INDEX `booking_team_members_hero_id_status_idx`(`hero_id`, `status`),
    UNIQUE INDEX `booking_team_members_booking_id_hero_id_key`(`booking_id`, `hero_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_team_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `inviter_hero_id` INTEGER NOT NULL,
    `invitee_hero_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `message` TEXT NULL,
    `responded_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `booking_team_requests_booking_id_status_idx`(`booking_id`, `status`),
    INDEX `booking_team_requests_invitee_hero_id_status_idx`(`invitee_hero_id`, `status`),
    INDEX `booking_team_requests_inviter_hero_id_status_idx`(`inviter_hero_id`, `status`),
    INDEX `booking_team_requests_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_no` VARCHAR(50) NOT NULL,
    `booking_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `city_id` INTEGER NULL,
    `invoice_date` DATE NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `payable_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `billing_name` VARCHAR(150) NULL,
    `billing_address` TEXT NULL,
    `billing_city` VARCHAR(100) NULL,
    `billing_state` VARCHAR(100) NULL,
    `billing_zip` VARCHAR(10) NULL,
    `billing_tax_id` VARCHAR(25) NULL,
    `terms` TEXT NULL,
    `user_notes` TEXT NULL,
    `admin_notes` TEXT NULL,
    `status` ENUM('CREATED', 'SENT', 'PAID', 'VOID', 'OVERDUE') NOT NULL DEFAULT 'CREATED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_no_key`(`invoice_no`),
    INDEX `invoices_booking_id_idx`(`booking_id`),
    INDEX `invoices_customer_id_idx`(`customer_id`),
    INDEX `invoices_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NULL,
    `invoice_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `recorded_by_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('CASH', 'UPI', 'CARD', 'NET_BANKING', 'WALLET', 'RAZORPAY', 'OTHER') NOT NULL,
    `provider` VARCHAR(50) NULL,
    `provider_payment_id` VARCHAR(155) NULL,
    `provider_order_id` VARCHAR(155) NULL,
    `reference` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `status` ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_booking_id_idx`(`booking_id`),
    INDEX `payments_invoice_id_idx`(`invoice_id`),
    INDEX `payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_type` ENUM('BOOKING', 'PACKAGE_PURCHASE') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `booking_id` INTEGER NULL,
    `environment` ENUM('SANDBOX', 'LIVE') NOT NULL,
    `provider` ENUM('ZOHO') NOT NULL DEFAULT 'ZOHO',
    `currency` CHAR(3) NOT NULL,
    `expected_amount` DECIMAL(10, 2) NOT NULL,
    `captured_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `refunded_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('CREATED', 'ATTEMPT_CREATING', 'AWAITING_CUSTOMER', 'PROCESSING', 'PAID', 'CREATION_FAILED', 'FAILED', 'EXPIRED', 'CANCELED', 'PARTIALLY_REFUNDED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    `commercial_version` INTEGER NOT NULL DEFAULT 1,
    `quote_hash` CHAR(64) NOT NULL,
    `quote_snapshot_json` JSON NOT NULL,
    `active_attempt_id` INTEGER NULL,
    `idempotency_key` VARCHAR(120) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `paid_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_orders_active_attempt_id_key`(`active_attempt_id`),
    INDEX `payment_orders_status_updated_idx`(`status`, `updated_at`),
    INDEX `payment_orders_customer_created_idx`(`customer_id`, `created_at`),
    INDEX `payment_orders_booking_idx`(`booking_id`),
    UNIQUE INDEX `payment_orders_subject_version_key`(`environment`, `subject_type`, `subject_id`, `commercial_version`),
    UNIQUE INDEX `payment_orders_idempotency_key`(`environment`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `legacy_payment_id` INTEGER NULL,
    `provider` ENUM('ZOHO') NOT NULL DEFAULT 'ZOHO',
    `environment` ENUM('SANDBOX', 'LIVE') NOT NULL,
    `attempt_number` INTEGER NOT NULL,
    `status` ENUM('CREATING', 'AWAITING_CUSTOMER', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED', 'SUPERSEDED') NOT NULL DEFAULT 'CREATING',
    `requested_amount` DECIMAL(10, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `provider_payment_link_id` VARCHAR(155) NULL,
    `provider_payment_id` VARCHAR(155) NULL,
    `provider_reference_id` VARCHAR(155) NULL,
    `checkout_url` TEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `failure_code` VARCHAR(100) NULL,
    `failure_message_safe` VARCHAR(500) NULL,
    `paid_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `expired_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_attempts_legacy_payment_id_key`(`legacy_payment_id`),
    INDEX `payment_attempts_status_updated_idx`(`status`, `updated_at`),
    INDEX `payment_attempts_reference_idx`(`provider_reference_id`),
    UNIQUE INDEX `payment_attempts_order_number_key`(`order_id`, `attempt_number`),
    UNIQUE INDEX `payment_attempts_link_environment_key`(`environment`, `provider_payment_link_id`),
    UNIQUE INDEX `payment_attempts_payment_environment_key`(`environment`, `provider_payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` ENUM('ZOHO') NOT NULL DEFAULT 'ZOHO',
    `environment` ENUM('SANDBOX', 'LIVE') NOT NULL,
    `event_id` VARCHAR(155) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `live_mode` BOOLEAN NOT NULL,
    `account_matched` BOOLEAN NOT NULL,
    `payload_hash` CHAR(64) NOT NULL,
    `normalized_subject_json` JSON NOT NULL,
    `processing_status` ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'QUARANTINED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error_code` VARCHAR(100) NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_webhook_events_processing_received_idx`(`processing_status`, `received_at`),
    INDEX `payment_webhook_events_type_received_idx`(`event_type`, `received_at`),
    UNIQUE INDEX `payment_webhook_events_provider_environment_event_key`(`provider`, `environment`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NULL,
    `attempt_id` INTEGER NULL,
    `webhook_event_id` INTEGER NULL,
    `actor_type` ENUM('SYSTEM', 'CUSTOMER', 'HERO', 'DASHBOARD', 'WEBHOOK', 'RECONCILER') NOT NULL,
    `actor_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `old_status` VARCHAR(50) NULL,
    `new_status` VARCHAR(50) NULL,
    `reason` VARCHAR(500) NULL,
    `safe_metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_audit_logs_order_created_idx`(`order_id`, `created_at`),
    INDEX `payment_audit_logs_attempt_created_idx`(`attempt_id`, `created_at`),
    INDEX `payment_audit_logs_webhook_idx`(`webhook_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `discount_type` ENUM('FLAT', 'PERCENTAGE') NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `min_cart_amount` DECIMAL(10, 2) NULL,
    `max_discount_amount` DECIMAL(10, 2) NULL,
    `city_id` INTEGER NULL,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    INDEX `coupons_city_id_idx`(`city_id`),
    INDEX `coupons_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` ENUM('HIGHLIGHT', 'CELEBRATION') NOT NULL DEFAULT 'HIGHLIGHT',
    `media_type` ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
    `title` VARCHAR(150) NOT NULL,
    `body` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `video_url` VARCHAR(500) NULL,
    `hero_name` VARCHAR(100) NULL,
    `hero_id` INTEGER NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `social_posts_category_is_published_idx`(`category`, `is_published`),
    INDEX `social_posts_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_leaves` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `type` ENUM('SICK', 'CASUAL', 'EMERGENCY', 'OTHER') NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `is_half_day` BOOLEAN NOT NULL DEFAULT false,
    `total_days` DECIMAL(4, 1) NOT NULL,
    `reason` TEXT NOT NULL,
    `proof_url` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_note` TEXT NULL,
    `requested_by_hero` BOOLEAN NOT NULL DEFAULT false,
    `penalty_amount` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hero_leaves_hero_id_status_idx`(`hero_id`, `status`),
    INDEX `hero_leaves_from_date_idx`(`from_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `off_day_work_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `off_day_work_requests_hero_id_status_idx`(`hero_id`, `status`),
    INDEX `off_day_work_requests_status_idx`(`status`),
    UNIQUE INDEX `off_day_work_requests_hero_id_date_key`(`hero_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `owner_id` INTEGER NOT NULL,
    `member_id` INTEGER NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hero_team_members_owner_id_is_active_idx`(`owner_id`, `is_active`),
    INDEX `hero_team_members_member_id_is_active_idx`(`member_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_team_invitations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inviter_id` INTEGER NOT NULL,
    `invitee_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `message` TEXT NULL,
    `responded_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hero_team_invitations_inviter_id_status_idx`(`inviter_id`, `status`),
    INDEX `hero_team_invitations_invitee_id_status_idx`(`invitee_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `video_url` VARCHAR(500) NOT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `duration_seconds` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `training_videos_category_id_is_published_idx`(`category_id`, `is_published`),
    INDEX `training_videos_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_certificates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_type` ENUM('IMAGE', 'PDF') NOT NULL DEFAULT 'IMAGE',
    `thumbnail_url` VARCHAR(500) NULL,
    `issued_date` DATE NULL,
    `valid_until` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hero_certificates_hero_id_is_active_idx`(`hero_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shop_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `icon_url` VARCHAR(500) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shop_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shop_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop_category_id` INTEGER NOT NULL,
    `service_category_id` INTEGER NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `mrp` DECIMAL(10, 2) NULL,
    `sizes` VARCHAR(150) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shop_products_shop_category_id_idx`(`shop_category_id`),
    INDEX `shop_products_service_category_id_idx`(`service_category_id`),
    INDEX `shop_products_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faqs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(80) NULL,
    `question` VARCHAR(300) NOT NULL,
    `answer` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `faqs_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_chat_threads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `subject` VARCHAR(200) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_message` VARCHAR(500) NULL,
    `unread_by_admin` INTEGER NOT NULL DEFAULT 0,
    `unread_by_hero` INTEGER NOT NULL DEFAULT 0,
    `unread_by_customer` INTEGER NOT NULL DEFAULT 0,
    `closed_at` DATETIME(3) NULL,
    `closed_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `support_chat_threads_hero_id_status_idx`(`hero_id`, `status`),
    INDEX `support_chat_threads_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `support_chat_threads_status_last_message_at_idx`(`status`, `last_message_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_chat_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thread_id` INTEGER NOT NULL,
    `sender_type` ENUM('HERO', 'CUSTOMER', 'ADMIN') NOT NULL,
    `sender_admin_id` INTEGER NULL,
    `text` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_chat_messages_thread_id_created_at_idx`(`thread_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `hero_id` INTEGER NULL,
    `service_rating` INTEGER NOT NULL,
    `hero_rating` INTEGER NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_reviews_booking_id_key`(`booking_id`),
    INDEX `booking_reviews_customer_id_created_at_idx`(`customer_id`, `created_at`),
    INDEX `booking_reviews_hero_id_created_at_idx`(`hero_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hero_id` INTEGER NOT NULL,
    `type` ENUM('REFERRAL_BONUS', 'BOOKING_EARNING', 'INCENTIVE_BONUS', 'WITHDRAWAL', 'ADJUSTMENT', 'PENALTY') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `reference_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_wallet_transactions_hero_id_created_at_idx`(`hero_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `type` ENUM('REFERRAL_BONUS', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `reference_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_wallet_transactions_customer_id_created_at_idx`(`customer_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_coin_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `type` ENUM('BOOKING_REWARD', 'REFERRAL_BONUS', 'SIGNUP_BONUS', 'REDEMPTION', 'EXPIRY', 'MANUAL_CREDIT', 'MANUAL_DEBIT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `expired` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_coin_transactions_customer_id_created_at_idx`(`customer_id`, `created_at`),
    INDEX `customer_coin_transactions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_user_attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `attendance_date` DATE NOT NULL,
    `check_in_at` DATETIME(3) NOT NULL,
    `check_out_at` DATETIME(3) NULL,
    `check_in_selfie_url` VARCHAR(500) NULL,
    `check_in_latitude` DECIMAL(10, 7) NULL,
    `check_in_longitude` DECIMAL(10, 7) NULL,
    `hub_distance_meters` INTEGER NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') NOT NULL DEFAULT 'PRESENT',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_user_attendance_user_id_idx`(`user_id`),
    INDEX `dashboard_user_attendance_attendance_date_idx`(`attendance_date`),
    UNIQUE INDEX `dashboard_user_attendance_user_id_attendance_date_key`(`user_id`, `attendance_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_user_leaves` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('CASUAL', 'SICK', 'PAID', 'UNPAID', 'COMP_OFF') NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_user_leaves_user_id_idx`(`user_id`),
    INDEX `dashboard_user_leaves_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('WEEKLY_HOLIDAY', 'PUBLIC_HOLIDAY', 'CELEBRATION', 'NATIONAL', 'REGIONAL', 'COMPANY', 'OPTIONAL') NOT NULL DEFAULT 'NATIONAL',
    `weekday` VARCHAR(3) NULL,
    `state_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `holidays_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `audience` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    `author_id` INTEGER NOT NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcements_published_at_idx`(`published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_notification_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `audience` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    `audience_id` INTEGER NULL,
    `sent_count` INTEGER NOT NULL DEFAULT 0,
    `failed_count` INTEGER NOT NULL DEFAULT 0,
    `sent_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `push_notification_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_type` ENUM('EMPLOYEE', 'HERO') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('ALLOWANCE', 'DEDUCTION') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `is_recurring` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_components_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslips` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_type` ENUM('EMPLOYEE', 'HERO') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `basic_salary` DECIMAL(10, 2) NOT NULL,
    `allowances_total` DECIMAL(10, 2) NOT NULL,
    `deductions_total` DECIMAL(10, 2) NOT NULL,
    `net_salary` DECIMAL(10, 2) NOT NULL,
    `working_days` INTEGER NOT NULL,
    `present_days` INTEGER NOT NULL,
    `components_json` TEXT NOT NULL,
    `notes` TEXT NULL,
    `generated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payslips_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
    UNIQUE INDEX `payslips_subject_type_subject_id_month_year_key`(`subject_type`, `subject_id`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_quotas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scope` ENUM('DASHBOARD_ROLE', 'ALL_HEROES') NOT NULL,
    `role_key` VARCHAR(50) NULL,
    `type` ENUM('CASUAL', 'SICK', 'PAID', 'UNPAID', 'COMP_OFF') NOT NULL,
    `days_per_year` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_quotas_scope_role_key_type_key`(`scope`, `role_key`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penalty_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruleKey` VARCHAR(50) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `grace_minutes` INTEGER NULL,
    `window_days` INTEGER NULL,
    `min_assignments` INTEGER NULL,
    `max_rate` DECIMAL(4, 3) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `penalty_rules_ruleKey_key`(`ruleKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `type` ENUM('STRING', 'JSON', 'NUMBER', 'BOOLEAN') NOT NULL DEFAULT 'STRING',
    `category` VARCHAR(50) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `app_settings_category_idx`(`category`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operational_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scope` ENUM('GLOBAL', 'STATE', 'HUB') NOT NULL,
    `scope_key` VARCHAR(50) NOT NULL,
    `state_id` INTEGER NULL,
    `hub_id` INTEGER NULL,
    `shift_start` VARCHAR(5) NOT NULL DEFAULT '09:30',
    `shift_end` VARCHAR(5) NOT NULL DEFAULT '18:30',
    `weekly_offs` JSON NOT NULL,
    `schedule_enabled` BOOLEAN NOT NULL DEFAULT true,
    `schedule_color` VARCHAR(20) NULL,
    `lunch_enabled` BOOLEAN NOT NULL DEFAULT true,
    `lunch_duration_minutes` INTEGER NOT NULL DEFAULT 30,
    `lunch_allowed_from_time` VARCHAR(5) NOT NULL DEFAULT '12:30',
    `lunch_allowed_to_time` VARCHAR(5) NOT NULL DEFAULT '15:00',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `operational_settings_scope_key_key`(`scope_key`),
    INDEX `operational_settings_scope_idx`(`scope`),
    INDEX `operational_settings_state_id_idx`(`state_id`),
    INDEX `operational_settings_hub_id_idx`(`hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lunch_break_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operational_setting_id` INTEGER NOT NULL,
    `subject_type` ENUM('HERO', 'EMPLOYEE') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lunch_break_assignments_operational_setting_id_idx`(`operational_setting_id`),
    UNIQUE INDEX `lunch_break_assignments_subject_type_subject_id_key`(`subject_type`, `subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `scope` ENUM('GLOBAL', 'STATE', 'HUB') NOT NULL,
    `state_id` INTEGER NULL,
    `hub_id` INTEGER NULL,
    `shift_start` VARCHAR(5) NOT NULL DEFAULT '09:30',
    `shift_end` VARCHAR(5) NOT NULL DEFAULT '18:30',
    `schedule_color` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `booking_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `work_schedules_scope_idx`(`scope`),
    INDEX `work_schedules_state_id_idx`(`state_id`),
    INDEX `work_schedules_hub_id_idx`(`hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_schedule_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_id` INTEGER NOT NULL,
    `subject_type` ENUM('HERO', 'EMPLOYEE') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `work_schedule_assignments_schedule_id_idx`(`schedule_id`),
    INDEX `work_schedule_assignments_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
    UNIQUE INDEX `work_schedule_assignments_subject_type_subject_id_key`(`subject_type`, `subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_login_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `logged_in_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `selfie_url` VARCHAR(500) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `hub_distance_meters` INTEGER NULL,
    `attendance_marked` BOOLEAN NOT NULL DEFAULT false,
    `blocked_reason` VARCHAR(50) NULL,
    `user_agent` VARCHAR(255) NULL,
    `ip_address` VARCHAR(45) NULL,

    INDEX `dashboard_login_logs_user_id_idx`(`user_id`),
    INDEX `dashboard_login_logs_logged_in_at_idx`(`logged_in_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_type` ENUM('EMPLOYEE', 'HERO') NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `type` ENUM('CASUAL', 'SICK', 'PAID', 'UNPAID', 'COMP_OFF') NOT NULL,
    `allotted` DECIMAL(5, 1) NOT NULL,
    `used` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_balances_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
    UNIQUE INDEX `leave_balances_subject_type_subject_id_year_type_key`(`subject_type`, `subject_id`, `year`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incentive_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_type` ENUM('GENERAL', 'OVERTIME') NOT NULL DEFAULT 'GENERAL',
    `scope` ENUM('STATE', 'HUB') NOT NULL,
    `state_id` INTEGER NULL,
    `hub_id` INTEGER NULL,
    `name` VARCHAR(120) NOT NULL,
    `overtime_rate_per_hour` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `incentive_plans_scope_idx`(`scope`),
    INDEX `incentive_plans_state_id_idx`(`state_id`),
    INDEX `incentive_plans_hub_id_idx`(`hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incentive_tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `target_revenue` DECIMAL(10, 2) NOT NULL,
    `bonus_amount` DECIMAL(10, 2) NOT NULL,
    `label` VARCHAR(120) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incentive_tiers_plan_id_idx`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_hero_capacities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `capacity_date` DATE NOT NULL,
    `service_group_id` INTEGER NOT NULL,
    `hub_id` INTEGER NOT NULL,
    `hero_count` INTEGER NOT NULL DEFAULT 0,
    `set_by_id` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `daily_hero_capacities_capacity_date_hub_id_idx`(`capacity_date`, `hub_id`),
    UNIQUE INDEX `daily_hero_capacities_capacity_date_service_group_id_hub_id_key`(`capacity_date`, `service_group_id`, `hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_capacity_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hub_id` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `booking_capacity_groups_hub_id_idx`(`hub_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_capacity_group_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,

    UNIQUE INDEX `booking_capacity_group_services_group_id_service_id_key`(`group_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_capacity_group_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `work_schedule_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_capacity_group_schedules_group_id_idx`(`group_id`),
    UNIQUE INDEX `booking_capacity_group_schedules_group_id_work_schedule_id_key`(`group_id`, `work_schedule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_capacity_daily` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `capacity_date` DATE NOT NULL,
    `work_schedule_id` INTEGER NOT NULL,
    `hero_count` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `set_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `booking_capacity_daily_group_id_capacity_date_idx`(`group_id`, `capacity_date`),
    UNIQUE INDEX `booking_capacity_daily_group_id_capacity_date_work_schedule__key`(`group_id`, `capacity_date`, `work_schedule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cities` ADD CONSTRAINT `cities_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hubs` ADD CONSTRAINT `hubs_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hubs` ADD CONSTRAINT `hubs_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_users` ADD CONSTRAINT `dashboard_users_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_users` ADD CONSTRAINT `dashboard_users_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_users` ADD CONSTRAINT `dashboard_users_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_city_scopes` ADD CONSTRAINT `dashboard_user_city_scopes_dashboard_user_id_fkey` FOREIGN KEY (`dashboard_user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_city_scopes` ADD CONSTRAINT `dashboard_user_city_scopes_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_hub_scopes` ADD CONSTRAINT `dashboard_user_hub_scopes_dashboard_user_id_fkey` FOREIGN KEY (`dashboard_user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_hub_scopes` ADD CONSTRAINT `dashboard_user_hub_scopes_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heroes` ADD CONSTRAINT `heroes_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heroes` ADD CONSTRAINT `heroes_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heroes` ADD CONSTRAINT `heroes_verified_by_id_fkey` FOREIGN KEY (`verified_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heroes` ADD CONSTRAINT `heroes_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `heroes` ADD CONSTRAINT `heroes_referred_by_hero_id_fkey` FOREIGN KEY (`referred_by_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_devices` ADD CONSTRAINT `hero_devices_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_documents` ADD CONSTRAINT `hero_documents_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_attendance` ADD CONSTRAINT `hero_attendance_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_attendance` ADD CONSTRAINT `hero_attendance_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_connectivity_logs` ADD CONSTRAINT `hero_connectivity_logs_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_latest_locations` ADD CONSTRAINT `hero_latest_locations_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_latest_locations` ADD CONSTRAINT `hero_latest_locations_attendance_id_fkey` FOREIGN KEY (`attendance_id`) REFERENCES `hero_attendance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_latest_locations` ADD CONSTRAINT `hero_latest_locations_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_location_access_audits` ADD CONSTRAINT `hero_location_access_audits_dashboard_user_id_fkey` FOREIGN KEY (`dashboard_user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_location_access_audits` ADD CONSTRAINT `hero_location_access_audits_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_skills` ADD CONSTRAINT `hero_skills_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_skills` ADD CONSTRAINT `hero_skills_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_refresh_tokens` ADD CONSTRAINT `hero_refresh_tokens_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_job_roles` ADD CONSTRAINT `hero_job_roles_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_job_roles` ADD CONSTRAINT `hero_job_roles_job_role_id_fkey` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_groups` ADD CONSTRAINT `service_groups_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `service_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_service_group_id_fkey` FOREIGN KEY (`service_group_id`) REFERENCES `service_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hub_service_availability` ADD CONSTRAINT `hub_service_availability_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hub_service_availability` ADD CONSTRAINT `hub_service_availability_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_variants` ADD CONSTRAINT `service_variants_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_refresh_tokens` ADD CONSTRAINT `customer_refresh_tokens_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customer_address_id_fkey` FOREIGN KEY (`customer_address_id`) REFERENCES `customer_addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_booked_by_id_fkey` FOREIGN KEY (`booked_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_assigned_hero_id_fkey` FOREIGN KEY (`assigned_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_partner_hero_id_fkey` FOREIGN KEY (`partner_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_legacy_assigned_hero_id_fkey` FOREIGN KEY (`legacy_assigned_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_service_category_id_fkey` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_time_slot_id_fkey` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customer_service_package_id_fkey` FOREIGN KEY (`customer_service_package_id`) REFERENCES `customer_service_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_booking_visits` ADD CONSTRAINT `legacy_booking_visits_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_booking_visits` ADD CONSTRAINT `legacy_booking_visits_matched_hero_id_fkey` FOREIGN KEY (`matched_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_customer_addresses` ADD CONSTRAINT `legacy_customer_addresses_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_wallet_transactions` ADD CONSTRAINT `legacy_wallet_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_wallet_transactions` ADD CONSTRAINT `legacy_wallet_transactions_attributed_hero_id_fkey` FOREIGN KEY (`attributed_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_invoice_snapshots` ADD CONSTRAINT `legacy_invoice_snapshots_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_dispatches` ADD CONSTRAINT `booking_dispatches_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_dispatch_participants` ADD CONSTRAINT `booking_dispatch_participants_dispatch_id_fkey` FOREIGN KEY (`dispatch_id`) REFERENCES `booking_dispatches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_dispatch_participants` ADD CONSTRAINT `booking_dispatch_participants_accepted_hero_id_fkey` FOREIGN KEY (`accepted_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_offer_attempts` ADD CONSTRAINT `booking_offer_attempts_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_offer_attempts` ADD CONSTRAINT `booking_offer_attempts_dispatch_id_fkey` FOREIGN KEY (`dispatch_id`) REFERENCES `booking_dispatches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_offer_attempts` ADD CONSTRAINT `booking_offer_attempts_participant_slot_id_fkey` FOREIGN KEY (`participant_slot_id`) REFERENCES `booking_dispatch_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_offer_attempts` ADD CONSTRAINT `booking_offer_attempts_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `booking_items_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `booking_items_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_items` ADD CONSTRAINT `booking_items_service_variant_id_fkey` FOREIGN KEY (`service_variant_id`) REFERENCES `service_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_service_packages` ADD CONSTRAINT `customer_service_packages_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_service_packages` ADD CONSTRAINT `customer_service_packages_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_service_packages` ADD CONSTRAINT `customer_service_packages_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_service_packages` ADD CONSTRAINT `customer_service_packages_service_variant_id_fkey` FOREIGN KEY (`service_variant_id`) REFERENCES `service_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_changed_by_hero_id_fkey` FOREIGN KEY (`changed_by_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_assignments` ADD CONSTRAINT `booking_assignments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_assignments` ADD CONSTRAINT `booking_assignments_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_assignments` ADD CONSTRAINT `booking_assignments_assigned_by_id_fkey` FOREIGN KEY (`assigned_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_service_group_id_fkey` FOREIGN KEY (`service_group_id`) REFERENCES `service_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_published_by_id_fkey` FOREIGN KEY (`published_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_capacity_plans` ADD CONSTRAINT `service_group_capacity_plans_locked_by_id_fkey` FOREIGN KEY (`locked_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `capacity_plan_shifts` ADD CONSTRAINT `capacity_plan_shifts_capacity_plan_id_fkey` FOREIGN KEY (`capacity_plan_id`) REFERENCES `service_group_capacity_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_route_lines` ADD CONSTRAINT `service_group_route_lines_capacity_plan_shift_id_fkey` FOREIGN KEY (`capacity_plan_shift_id`) REFERENCES `capacity_plan_shifts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_group_route_lines` ADD CONSTRAINT `service_group_route_lines_assigned_hero_id_fkey` FOREIGN KEY (`assigned_hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_route_reservations` ADD CONSTRAINT `booking_route_reservations_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_route_reservations` ADD CONSTRAINT `booking_route_reservations_route_line_id_fkey` FOREIGN KEY (`route_line_id`) REFERENCES `service_group_route_lines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_route_reservations` ADD CONSTRAINT `booking_route_reservations_service_group_id_fkey` FOREIGN KEY (`service_group_id`) REFERENCES `service_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_members` ADD CONSTRAINT `booking_team_members_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_members` ADD CONSTRAINT `booking_team_members_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_members` ADD CONSTRAINT `booking_team_members_invited_by_hero_id_fkey` FOREIGN KEY (`invited_by_hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_members` ADD CONSTRAINT `booking_team_members_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `booking_team_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_requests` ADD CONSTRAINT `booking_team_requests_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_requests` ADD CONSTRAINT `booking_team_requests_inviter_hero_id_fkey` FOREIGN KEY (`inviter_hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_team_requests` ADD CONSTRAINT `booking_team_requests_invitee_hero_id_fkey` FOREIGN KEY (`invitee_hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_recorded_by_id_fkey` FOREIGN KEY (`recorded_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_active_attempt_id_fkey` FOREIGN KEY (`active_attempt_id`) REFERENCES `payment_attempts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `payment_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_legacy_payment_id_fkey` FOREIGN KEY (`legacy_payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_audit_logs` ADD CONSTRAINT `payment_audit_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `payment_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_audit_logs` ADD CONSTRAINT `payment_audit_logs_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `payment_attempts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_audit_logs` ADD CONSTRAINT `payment_audit_logs_webhook_event_id_fkey` FOREIGN KEY (`webhook_event_id`) REFERENCES `payment_webhook_events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_posts` ADD CONSTRAINT `social_posts_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_posts` ADD CONSTRAINT `social_posts_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_leaves` ADD CONSTRAINT `hero_leaves_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_leaves` ADD CONSTRAINT `hero_leaves_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `off_day_work_requests` ADD CONSTRAINT `off_day_work_requests_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `off_day_work_requests` ADD CONSTRAINT `off_day_work_requests_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_team_members` ADD CONSTRAINT `hero_team_members_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_team_members` ADD CONSTRAINT `hero_team_members_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_team_invitations` ADD CONSTRAINT `hero_team_invitations_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_team_invitations` ADD CONSTRAINT `hero_team_invitations_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_videos` ADD CONSTRAINT `training_videos_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `training_videos` ADD CONSTRAINT `training_videos_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_certificates` ADD CONSTRAINT `hero_certificates_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_certificates` ADD CONSTRAINT `hero_certificates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_products` ADD CONSTRAINT `shop_products_shop_category_id_fkey` FOREIGN KEY (`shop_category_id`) REFERENCES `shop_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_products` ADD CONSTRAINT `shop_products_service_category_id_fkey` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_products` ADD CONSTRAINT `shop_products_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_threads` ADD CONSTRAINT `support_chat_threads_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_threads` ADD CONSTRAINT `support_chat_threads_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_messages` ADD CONSTRAINT `support_chat_messages_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `support_chat_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_messages` ADD CONSTRAINT `support_chat_messages_sender_admin_id_fkey` FOREIGN KEY (`sender_admin_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_reviews` ADD CONSTRAINT `booking_reviews_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_reviews` ADD CONSTRAINT `booking_reviews_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_reviews` ADD CONSTRAINT `booking_reviews_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_wallet_transactions` ADD CONSTRAINT `hero_wallet_transactions_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `heroes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_wallet_transactions` ADD CONSTRAINT `customer_wallet_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_coin_transactions` ADD CONSTRAINT `customer_coin_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_attendance` ADD CONSTRAINT `dashboard_user_attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_leaves` ADD CONSTRAINT `dashboard_user_leaves_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_user_leaves` ADD CONSTRAINT `dashboard_user_leaves_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_settings` ADD CONSTRAINT `operational_settings_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_settings` ADD CONSTRAINT `operational_settings_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lunch_break_assignments` ADD CONSTRAINT `lunch_break_assignments_operational_setting_id_fkey` FOREIGN KEY (`operational_setting_id`) REFERENCES `operational_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_schedule_assignments` ADD CONSTRAINT `work_schedule_assignments_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `work_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_login_logs` ADD CONSTRAINT `dashboard_login_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incentive_plans` ADD CONSTRAINT `incentive_plans_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incentive_plans` ADD CONSTRAINT `incentive_plans_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incentive_tiers` ADD CONSTRAINT `incentive_tiers_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `incentive_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_hero_capacities` ADD CONSTRAINT `daily_hero_capacities_service_group_id_fkey` FOREIGN KEY (`service_group_id`) REFERENCES `service_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_hero_capacities` ADD CONSTRAINT `daily_hero_capacities_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_hero_capacities` ADD CONSTRAINT `daily_hero_capacities_set_by_id_fkey` FOREIGN KEY (`set_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_groups` ADD CONSTRAINT `booking_capacity_groups_hub_id_fkey` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_groups` ADD CONSTRAINT `booking_capacity_groups_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_group_services` ADD CONSTRAINT `booking_capacity_group_services_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `booking_capacity_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_group_services` ADD CONSTRAINT `booking_capacity_group_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_group_schedules` ADD CONSTRAINT `booking_capacity_group_schedules_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `booking_capacity_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_group_schedules` ADD CONSTRAINT `booking_capacity_group_schedules_work_schedule_id_fkey` FOREIGN KEY (`work_schedule_id`) REFERENCES `work_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_daily` ADD CONSTRAINT `booking_capacity_daily_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `booking_capacity_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_daily` ADD CONSTRAINT `booking_capacity_daily_work_schedule_id_fkey` FOREIGN KEY (`work_schedule_id`) REFERENCES `work_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_capacity_daily` ADD CONSTRAINT `booking_capacity_daily_set_by_id_fkey` FOREIGN KEY (`set_by_id`) REFERENCES `dashboard_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

