-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 24, 2025 at 10:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `shopzeo_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL COMMENT 'Banner title',
  `subtitle` varchar(255) DEFAULT NULL COMMENT 'Banner subtitle',
  `description` text DEFAULT NULL COMMENT 'Banner description',
  `image` varchar(500) NOT NULL COMMENT 'Banner image path',
  `image_alt_text` varchar(255) DEFAULT NULL COMMENT 'Alt text for banner image',
  `banner_type` enum('main_banner','footer_banner','popup_banner','sidebar_banner','category_banner','product_banner') NOT NULL DEFAULT 'main_banner' COMMENT 'Type of banner placement',
  `resource_type` enum('custom','product','category','store','page') NOT NULL DEFAULT 'custom' COMMENT 'Type of resource this banner links to',
  `resource_id` int(11) DEFAULT NULL COMMENT 'ID of the linked resource (product, category, etc.)',
  `resource_url` varchar(500) DEFAULT NULL COMMENT 'Custom URL for banner link',
  `button_text` varchar(100) DEFAULT NULL COMMENT 'Text for call-to-action button',
  `button_url` varchar(500) DEFAULT NULL COMMENT 'URL for call-to-action button',
  `start_date` datetime DEFAULT NULL COMMENT 'Banner start date',
  `end_date` datetime DEFAULT NULL COMMENT 'Banner end date',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Banner status',
  `is_featured` tinyint(1) DEFAULT 0 COMMENT 'Whether banner is featured',
  `sort_order` int(11) DEFAULT 0 COMMENT 'Sort order for display',
  `clicks` int(11) DEFAULT 0 COMMENT 'Number of banner clicks',
  `impressions` int(11) DEFAULT 0 COMMENT 'Number of banner impressions',
  `ctr` decimal(5,2) DEFAULT 0.00 COMMENT 'Click-through rate percentage',
  `target_audience` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Target audience criteria (age, location, etc.)' CHECK (json_valid(`target_audience`)),
  `display_conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Conditions for banner display' CHECK (json_valid(`display_conditions`)),
  `meta_title` varchar(255) DEFAULT NULL COMMENT 'SEO meta title',
  `meta_description` text DEFAULT NULL COMMENT 'SEO meta description',
  `meta_keywords` text DEFAULT NULL COMMENT 'SEO meta keywords',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `banners`
--

INSERT INTO banners (id, title, subtitle, description, image, banner_type, button_text, button_url, is_active, is_featured, sort_order, clicks, impressions, ctr, created_at, updated_at) VALUES
(1, 'Home Appliances', 'Transform Your Home', 'Discover premium home appliances and kitchen essentials.', 'https://linkiin.in/uploads/banners/banner-1755809762268-699131231.jpeg', NULL, 'main_banner', '', NULL, NULL, 'Get Yours', '/products/home-appliances', NULL, NULL, 1, 1, 1, 0, 0, 0.00, NULL, NULL, NULL, NOW(), NOW()),
(2, 'Electronics', 'Latest Tech Gadgets', 'Shop the newest electronics and other electronic devices.', 'https://linkiin.in/uploads/banners/banner-1755809886301-157616563.jpeg', NULL, 'category_banner', '', NULL, NULL, 'Shop Now', '/products/electronics', NULL, NULL, 1, 1, 2, 0, 0, 0.00, NULL, NULL, NULL, NOW(), NOW()),
(3, 'Kitchen Appliances', 'Transform Your Kitchen', 'Premium quality kitchen appliances for modern homes.', 'https://linkiin.in/uploads/banners/banner-1755809932151-228409246.jpeg', NULL, 'product_banner', '', NULL, NULL, 'Explore', '/products/kitchen-appliances', NULL, NULL, 1, 0, 3, 0, 0, 0.00, NULL, NULL, NULL, NOW(), NOW());

--
-- Indexes for dumped tables
--

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_banner_type` (`banner_type`),
  ADD KEY `idx_banner_active` (`is_active`),
  ADD KEY `idx_banner_featured` (`is_featured`),
  ADD KEY `idx_banner_sort_order` (`sort_order`),
  ADD KEY `idx_banner_dates` (`start_date`,`end_date`),
  ADD KEY `idx_banner_resource` (`resource_type`,`resource_id`),
  ADD KEY `banners_banner_type` (`banner_type`),
  ADD KEY `banners_resource_type` (`resource_type`),
  ADD KEY `banners_resource_id` (`resource_id`),
  ADD KEY `banners_is_active` (`is_active`),
  ADD KEY `banners_is_featured` (`is_featured`),
  ADD KEY `banners_sort_order` (`sort_order`),
  ADD KEY `banners_start_date` (`start_date`),
  ADD KEY `banners_end_date` (`end_date`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
