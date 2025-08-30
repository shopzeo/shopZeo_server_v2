-- Create OTP verifications table for phone verification
CREATE TABLE `otp_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` char(36) NOT NULL COMMENT 'Foreign key to users table (UUID)',
  `otp` varchar(6) NOT NULL COMMENT '6-digit OTP code',
  `expires_at` datetime NOT NULL COMMENT 'OTP expiration timestamp',
  `is_used` tinyint(1) DEFAULT 0 COMMENT 'Whether OTP has been used',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_otp` (`otp`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_used` (`is_used`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_otp_verifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OTP verification codes for phone verification';

-- Add index for faster OTP lookups
CREATE INDEX `idx_otp_verifications_lookup` ON `otp_verifications` (`user_id`, `otp`, `expires_at`, `is_used`);
