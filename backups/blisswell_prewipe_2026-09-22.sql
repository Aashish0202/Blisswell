-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: blisswell
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `banners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `position` enum('home_top','home_middle','home_bottom') DEFAULT 'home_top',
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banners`
--

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cashback_claims`
--

DROP TABLE IF EXISTS `cashback_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cashback_claims` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `entitlement_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `claim_date` date NOT NULL,
  `reference_key` varchar(64) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cc_ref` (`reference_key`),
  UNIQUE KEY `uq_cc_user_day` (`user_id`,`claim_date`),
  KEY `idx_cc_entitlement` (`entitlement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cashback_claims`
--

LOCK TABLES `cashback_claims` WRITE;
/*!40000 ALTER TABLE `cashback_claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `cashback_claims` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cashback_entitlements`
--

DROP TABLE IF EXISTS `cashback_entitlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cashback_entitlements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `order_id` varchar(100) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `amount_per_claim` decimal(12,2) NOT NULL DEFAULT 10.00,
  `max_claims` int(11) NOT NULL DEFAULT 20,
  `claims_completed` int(11) NOT NULL DEFAULT 0,
  `total_earned` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','exhausted','disabled') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ce_order` (`order_id`),
  KEY `idx_ce_user_status` (`user_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cashback_entitlements`
--

LOCK TABLES `cashback_entitlements` WRITE;
/*!40000 ALTER TABLE `cashback_entitlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `cashback_entitlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cms_content`
--

DROP TABLE IF EXISTS `cms_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cms_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `page_name` varchar(100) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cms_content`
--

LOCK TABLES `cms_content` WRITE;
/*!40000 ALTER TABLE `cms_content` DISABLE KEYS */;
/*!40000 ALTER TABLE `cms_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gallery`
--

DROP TABLE IF EXISTS `gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gallery` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'bedroom',
  `image_url` varchar(500) NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gallery`
--

LOCK TABLES `gallery` WRITE;
/*!40000 ALTER TABLE `gallery` DISABLE KEYS */;
INSERT INTO `gallery` VALUES (2,'Double Bedsheet',NULL,'bedroom','/uploads/gallery/gallery-1772706051339-158103112.jpg',0,1,'2026-03-05 10:23:16','2026-03-05 10:23:16'),(3,'MARVEL 2026 4',NULL,'Bedsheets','/uploads/gallery/gallery-1772869248797-265082771.jpg',0,1,'2026-03-07 07:42:53','2026-03-07 07:42:53'),(14,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249459-234346271.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54'),(15,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249517-638352567.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54'),(16,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249578-993717242.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54'),(17,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249642-789666008.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54'),(18,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249698-996111607.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54'),(21,'diamond 1+1 5',NULL,'Bedsheets','/uploads/gallery/gallery-1772869249860-96670981.jpg',0,1,'2026-03-07 07:42:54','2026-03-07 07:42:54');
/*!40000 ALTER TABLE `gallery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incentive_credits`
--

DROP TABLE IF EXISTS `incentive_credits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_credits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cycle_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `payout_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cycle_payout_date` (`cycle_id`,`payout_date`),
  KEY `idx_cycle_date` (`cycle_id`,`payout_date`),
  KEY `idx_user_date` (`user_id`,`payout_date`),
  CONSTRAINT `incentive_credits_ibfk_1` FOREIGN KEY (`cycle_id`) REFERENCES `salary_cycles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incentive_credits_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incentive_credits`
--

LOCK TABLES `incentive_credits` WRITE;
/*!40000 ALTER TABLE `incentive_credits` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_credits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_type` enum('wallet','razorpay','repurchase_wallet') DEFAULT 'wallet',
  `status` enum('pending','processing','shipped','delivered','cancelled','failed') DEFAULT 'pending',
  `order_source` enum('user','auto_repurchase') NOT NULL DEFAULT 'user',
  `source_withdrawal_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_orders_source` (`order_source`),
  KEY `idx_orders_src_wd` (`source_withdrawal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,30,2,'BSW100000030',849.00,'wallet','delivered','user',NULL,'2026-09-16 06:30:18','2026-09-16 06:30:18'),(2,28,1,'BSW100000028',349.00,'wallet','delivered','user',NULL,'2026-09-16 06:32:41','2026-09-16 06:32:41'),(3,29,2,'BSW100000029',849.00,'wallet','delivered','user',NULL,'2026-09-16 06:32:41','2026-09-16 06:32:41'),(4,30,3,'BSW100000030',1749.00,'wallet','delivered','user',NULL,'2026-09-16 06:32:41','2026-09-16 06:32:41'),(5,30,4,'BSW100000030',4449.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-16 06:35:28','2026-09-16 06:35:28'),(6,29,3,'BSW100000029',1749.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-16 06:36:14','2026-09-16 06:36:14'),(7,29,4,'BSW100000029',4449.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-16 06:36:14','2026-09-16 06:36:14'),(8,28,1,'BSW100000028',349.00,'razorpay','failed','user',NULL,'2026-09-18 07:43:59','2026-09-18 07:44:08'),(9,28,1,'BSW100000028',349.00,'razorpay','failed','user',NULL,'2026-09-18 07:44:15','2026-09-18 07:44:21'),(10,29,1,'BSW100000029',349.00,'razorpay','failed','user',NULL,'2026-09-18 07:47:59','2026-09-18 08:28:00'),(11,31,1,'BSW100000031',349.00,'razorpay','delivered','user',NULL,'2026-09-18 07:51:35','2026-09-18 07:52:35'),(17,37,4,'BSW100000037',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(18,38,4,'BSW100000038',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(19,39,4,'BSW100000039',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(20,40,4,'BSW100000040',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(21,41,4,'BSW100000041',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(22,42,4,'BSW100000042',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(23,43,4,'BSW100000043',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(24,44,4,'BSW100000044',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(25,45,4,'BSW100000045',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(26,46,4,'BSW100000046',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(27,47,4,'BSW100000047',4449.00,'wallet','delivered','user',NULL,'2026-09-19 07:53:18','2026-09-19 07:53:18'),(28,48,1,'BSW100000048',349.00,'razorpay','delivered','user',NULL,'2026-09-19 08:23:00','2026-09-19 08:23:45'),(29,49,1,'BSW100000049',349.00,'wallet','delivered','user',NULL,'2026-09-19 10:13:37','2026-09-19 10:13:37'),(30,49,2,'BSW100000049',849.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-19 10:14:40','2026-09-19 10:14:40'),(31,49,3,'BSW100000049',1749.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-19 10:14:40','2026-09-19 10:14:40'),(32,49,4,'BSW100000049',4449.00,'repurchase_wallet','delivered','auto_repurchase',NULL,'2026-09-19 10:14:40','2026-09-19 10:14:40'),(36,28,2,'BSW100000028',849.00,'repurchase_wallet','delivered','auto_repurchase',6,'2026-09-19 11:16:23','2026-09-19 11:16:23');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `rank_name` varchar(50) DEFAULT NULL,
  `level_income` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`level_income`)),
  `rank_order` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `salary_amount` decimal(12,2) DEFAULT 100.00,
  `salary_duration` int(11) DEFAULT 12,
  `daily_amount` decimal(12,2) DEFAULT 0.00,
  `days` int(11) DEFAULT 0,
  `image` varchar(500) DEFAULT NULL,
  `images` text DEFAULT NULL,
  `youtube_link` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Star','Star','[100,25,25,10,10,10,10,15]',1,'Star Rank package. Activates your account and unlocks the Star level income table (8 levels) for your upline.',349.00,100.00,12,0.00,0,NULL,NULL,NULL,1,'2026-09-16 06:20:57','2026-09-16 07:03:44'),(2,'Silver','Silver','[200,50,50,20,20,20,20,30]',2,'Silver Rank package. Activates your account and unlocks the Silver level income table (8 levels) for your upline.',849.00,100.00,12,0.00,0,NULL,NULL,NULL,1,'2026-09-16 06:20:57','2026-09-16 07:03:44'),(3,'Gold','Gold','[400,100,100,40,40,40,40,0]',3,'Gold Rank package. Activates your account and unlocks the Gold level income table (8 levels) for your upline.',1749.00,100.00,12,0.00,0,NULL,NULL,NULL,1,'2026-09-16 06:20:57','2026-09-16 07:03:44'),(4,'Platinum','Platinum','[800,200,200,80,80,80,80,120]',4,'Platinum Rank package. Activates your account and unlocks the Platinum level income table (8 levels) for your upline.',4449.00,100.00,12,0.00,0,NULL,NULL,NULL,1,'2026-09-16 06:20:57','2026-09-16 07:03:44');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_cycles`
--

DROP TABLE IF EXISTS `salary_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salary_cycles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sponsor_id` int(11) NOT NULL,
  `referral_id` int(11) NOT NULL,
  `start_month` date NOT NULL,
  `start_date` date DEFAULT NULL,
  `monthly_amount` decimal(12,2) NOT NULL DEFAULT 100.00,
  `daily_amount` decimal(12,2) DEFAULT 0.00,
  `duration` int(11) DEFAULT 12,
  `days` int(11) DEFAULT 0,
  `months_paid` int(11) DEFAULT 0,
  `days_paid` int(11) DEFAULT 0,
  `status` enum('active','paused','completed') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_cycles`
--

LOCK TABLES `salary_cycles` WRITE;
/*!40000 ALTER TABLE `salary_cycles` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_cycles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_payouts`
--

DROP TABLE IF EXISTS `salary_payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salary_payouts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cycle_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `month` int(11) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `payout_date` date DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('pending','paid','cancelled') DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_payouts`
--

LOCK TABLES `salary_payouts` WRITE;
/*!40000 ALTER TABLE `salary_payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `setting_audit_logs`
--

DROP TABLE IF EXISTS `setting_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `setting_audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `previous_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sal_admin` (`admin_id`),
  KEY `idx_sal_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `setting_audit_logs`
--

LOCK TABLES `setting_audit_logs` WRITE;
/*!40000 ALTER TABLE `setting_audit_logs` DISABLE KEYS */;
INSERT INTO `setting_audit_logs` VALUES (1,1,'withdrawal_start_time','07:00','00:00','::1','2026-09-03 07:52:48'),(2,1,'withdrawal_end_time','10:00','23:59','::1','2026-09-03 07:52:48'),(3,1,'withdrawal_start_time','00:00','07:00','::1','2026-09-03 07:52:48'),(4,1,'withdrawal_end_time','23:59','10:00','::1','2026-09-03 07:52:48'),(5,1,'withdrawal_start_time','07:00','00:00','::1','2026-09-03 07:54:11'),(6,1,'withdrawal_end_time','10:00','23:59','::1','2026-09-03 07:54:11'),(7,1,'withdrawal_start_time','00:00','07:00','::1','2026-09-03 07:54:11'),(8,1,'withdrawal_end_time','23:59','10:00','::1','2026-09-03 07:54:11'),(9,1,'withdrawal_end_time','10:00','20:00','::1','2026-09-19 07:58:55');
/*!40000 ALTER TABLE `setting_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (5,'repurchase_enabled','true','Allow repurchase of package','2026-02-27 07:43:53','2026-02-27 07:43:53'),(6,'site_logo','/uploads/logos/logo-1777870561375-680335915.png',NULL,'2026-03-03 05:26:52','2026-05-04 04:56:01'),(7,'site_name','Blisswell',NULL,'2026-03-03 05:48:21','2026-03-03 05:48:21'),(8,'site_tagline','Premium Bedsheets',NULL,'2026-03-03 05:48:21','2026-03-03 05:48:21'),(9,'contact_phone','+919011166599',NULL,'2026-03-03 05:48:21','2026-04-09 09:15:25'),(10,'contact_email','blisswellenterprises@gmail.com',NULL,'2026-03-03 05:48:21','2026-04-22 06:56:22'),(11,'contact_address','Name- Blisswell enterprises Address- 4th floor, A-409, Business Plaza,Surat nashik highway,Panchawati,Nashik Maharashtra- 422003\n',NULL,'2026-03-03 05:48:21','2026-05-07 06:19:13'),(12,'social_facebook','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(13,'social_instagram','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(14,'social_twitter','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(15,'social_linkedin','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(16,'social_youtube','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(17,'terms_and_conditions','BLISSWELL ENTERPRISES\nRecurring Affiliate Marketing Legal Agreement \n\nCompany Details - BLISSWELL ENTERPRISES \nAddress- Shop no A+409, Business Plaza, landmark ,  Panchavati, Distict - nashik \nState - Maharashtra \nPin code - 422003\nGST number- 27ANJPC4891P1ZB\n\nBusiness Plan Summary-\nBy registering, you agreed to our terms of service and privacy policy. You acknowledge that the Affiliate program is subject to the company\'s terms and conditions. \n\n1) The Company hereby appoints the Affiliate partner to promote and sell the Company’s products through affiliate marketing.\nThe affiliate partner accepts this appointment and agrees to operate according to the policies and procedures of the Company.\n\n2) The affiliate partner is an independent contractor and not an employee, partner, or agent of the Company.\nThe Affiliate partner shall not represent themselves as an employee or official representative of the Company.\n\n3) To become a Affiliate partner, The individual must be at least 18 years old.\nValid KYC documents must be submitted.\nThe individual must agree to all company policies and procedures.\n\n4) The Affiliate partner may purchase products from the Company at the official price determined by the Company.\nThe Company reserves the right to change product prices at any time.\n\n5)  The Company will pay commissions and incentives based on the approved compensation plan.\nAll affiliate commission are subject to verification of valid sales transactions.\n\n6)  bonuses will be credited to the Affiliate partner wallet/account.\nPayouts will be processed according to the company payout schedule, typically on every month.\nThe Company may deduct applicable taxes (TDS/GST) as per government regulations.\n\n7)  Promote the Company’s products honestly and ethically.\nNot make false or misleading income claims ,Not misrepresent the Company or its products.\nFollow all marketing and promotional guidelines issued by the Company.\nViolation of these rules may result in suspension or termination of the Affiliate partner ID.\n\n8)  Customers may return products within the Company’s return policy period (usually 7 days from delivery) if the product is unused and in original condition.\nRefunds will be processed according to the Company’s refund policy.\n\n9) The affiliate partner agrees not to disclose confidential information of the Company, including business plans, pricing structures, and marketing strategies.\n\n10) The Company reserves the right to terminate the Affiliate partner account if Fraudulent or illegal activities are detected.\nCompany policies are violated.\nMisrepresentation of products or income occurs.\nThe affiliate partner may also terminate this agreement by providing written notice to the Company.\n\n11) The Company shall not be liable for any indirect or consequential losses incurred by the affiliate partner.\nIncome depends on individual effort, sales performance, and market conditions.\n\n12) This Agreement shall be governed by the laws of India and applicable regulations related to affiliate marketing.\n\n13) The affiliate partner confirms that they have read, understood, and agreed to all the terms and conditions mentioned above.\n\nBusiness plan summary -\n\n1. Nature of Business - This is Product affiliate marketing program. Earning are solely based on product sales.\n\n2. Incentive Terms-\nIncentives are distributed over 6 months subject to valid sales and no refunded cases.\n\n3. Compliance-\nThis plan complies affiliate marketing Rules and is not a money circulation scheme.\n\n4. Payment Terms-\nPayment will be processed monthly after verification transactions.\n\n5. Termination-\nCompany reserves the right to terminate accounts in case of fraud or policy violation.\n\n6. Refund Policy-\nIn case of refund , related incentives will be cancelled.\n\n7. Legal jurisdiction-\nAll disputes are subject to jurisdiction of local courts in Maharashtra, India.',NULL,'2026-03-10 11:38:32','2026-07-12 09:57:19'),(28,'self_cashback_enabled','true','Self Cashback master on/off switch','2026-09-03 06:39:25','2026-09-03 06:39:25'),(29,'self_cashback_amount_per_claim','10','Amount credited per self-cashback claim (Ôé╣)','2026-09-03 06:39:25','2026-09-03 07:04:52'),(30,'self_cashback_max_claims','20','Maximum claims per entitlement','2026-09-03 06:39:25','2026-09-03 06:39:25'),(41,'qualification_levels_per_direct','2','Max levels unlocked per qualified direct','2026-09-03 06:39:25','2026-09-03 06:39:25'),(42,'qualification_max_levels','8','Hard cap on unlocked levels','2026-09-03 06:39:25','2026-09-16 06:20:57'),(43,'withdrawal_min_amount','200','Minimum withdrawal amount (Ôé╣)','2026-09-03 06:39:25','2026-09-03 06:39:25'),(44,'withdrawal_start_time','07:00','Withdrawal window start (IST, 24h)','2026-09-03 06:39:25','2026-09-16 06:37:25'),(45,'withdrawal_end_time','10:00','Withdrawal window end (IST, 24h)','2026-09-03 06:39:25','2026-09-22 06:09:35'),(46,'withdrawal_timezone','Asia/Kolkata','Timezone for withdrawal window / server time','2026-09-03 06:39:25','2026-09-03 06:39:25'),(95,'withdrawal_admin_charge_percent','5','Admin charge percent on withdrawal processing (%)','2026-09-16 06:20:57','2026-09-16 06:20:57'),(96,'repurchase_share_percent','20','Percent of withdrawal credited to repurchase wallet (%)','2026-09-16 06:20:57','2026-09-16 06:20:57'),(97,'auto_repurchase_enabled','true','Auto repurchase engine master switch','2026-09-16 06:20:57','2026-09-16 06:20:57');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_income_events`
--

DROP TABLE IF EXISTS `team_income_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_income_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `purchaser_id` int(11) NOT NULL,
  `upline_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `rank_name` varchar(50) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `qualified_directs` int(11) NOT NULL,
  `max_unlocked_level` int(11) NOT NULL,
  `reference_key` varchar(64) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tie_ref` (`reference_key`),
  KEY `idx_tie_upline` (`upline_id`),
  KEY `idx_tie_order` (`order_id`),
  KEY `idx_tie_purchaser` (`purchaser_id`),
  KEY `idx_tie_rank` (`rank_name`),
  KEY `idx_tie_product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_income_events`
--

LOCK TABLES `team_income_events` WRITE;
/*!40000 ALTER TABLE `team_income_events` DISABLE KEYS */;
INSERT INTO `team_income_events` VALUES (1,'3',29,28,1,200.00,'Silver',2,1,2,'TI-3-28-1',8,'2026-09-16 06:32:41'),(2,'4',30,29,1,400.00,'Gold',3,1,2,'TI-4-29-1',10,'2026-09-16 06:32:41'),(3,'4',30,28,2,100.00,'Gold',3,1,2,'TI-4-28-2',11,'2026-09-16 06:32:41'),(4,'5',30,29,1,800.00,'Platinum',4,1,2,'TI-5-29-1',15,'2026-09-16 06:35:28'),(5,'5',30,28,2,200.00,'Platinum',4,1,2,'TI-5-28-2',16,'2026-09-16 06:35:28'),(6,'6',29,28,1,400.00,'Gold',3,1,2,'TI-6-28-1',18,'2026-09-16 06:36:14'),(7,'7',29,28,1,800.00,'Platinum',4,1,2,'TI-7-28-1',20,'2026-09-16 06:36:14'),(15,'18',38,37,1,800.00,'Platinum',4,1,8,'TI-18-37-1',47,'2026-09-19 07:53:17'),(16,'19',39,38,1,800.00,'Platinum',4,1,8,'TI-19-38-1',50,'2026-09-19 07:53:17'),(17,'19',39,37,2,200.00,'Platinum',4,1,8,'TI-19-37-2',51,'2026-09-19 07:53:17'),(18,'20',40,39,1,800.00,'Platinum',4,1,8,'TI-20-39-1',54,'2026-09-19 07:53:17'),(19,'20',40,38,2,200.00,'Platinum',4,1,8,'TI-20-38-2',55,'2026-09-19 07:53:17'),(20,'20',40,37,3,200.00,'Platinum',4,1,8,'TI-20-37-3',56,'2026-09-19 07:53:17'),(21,'21',41,40,1,800.00,'Platinum',4,1,8,'TI-21-40-1',59,'2026-09-19 07:53:17'),(22,'21',41,39,2,200.00,'Platinum',4,1,8,'TI-21-39-2',60,'2026-09-19 07:53:17'),(23,'21',41,38,3,200.00,'Platinum',4,1,8,'TI-21-38-3',61,'2026-09-19 07:53:17'),(24,'21',41,37,4,80.00,'Platinum',4,1,8,'TI-21-37-4',62,'2026-09-19 07:53:17'),(25,'22',42,41,1,800.00,'Platinum',4,1,8,'TI-22-41-1',65,'2026-09-19 07:53:17'),(26,'22',42,40,2,200.00,'Platinum',4,1,8,'TI-22-40-2',66,'2026-09-19 07:53:17'),(27,'22',42,39,3,200.00,'Platinum',4,1,8,'TI-22-39-3',67,'2026-09-19 07:53:17'),(28,'22',42,38,4,80.00,'Platinum',4,1,8,'TI-22-38-4',68,'2026-09-19 07:53:17'),(29,'22',42,37,5,80.00,'Platinum',4,1,8,'TI-22-37-5',69,'2026-09-19 07:53:17'),(30,'23',43,42,1,800.00,'Platinum',4,1,8,'TI-23-42-1',72,'2026-09-19 07:53:17'),(31,'23',43,41,2,200.00,'Platinum',4,1,8,'TI-23-41-2',73,'2026-09-19 07:53:17'),(32,'23',43,40,3,200.00,'Platinum',4,1,8,'TI-23-40-3',74,'2026-09-19 07:53:17'),(33,'23',43,39,4,80.00,'Platinum',4,1,8,'TI-23-39-4',75,'2026-09-19 07:53:17'),(34,'23',43,38,5,80.00,'Platinum',4,1,8,'TI-23-38-5',76,'2026-09-19 07:53:17'),(35,'23',43,37,6,80.00,'Platinum',4,1,8,'TI-23-37-6',77,'2026-09-19 07:53:17'),(36,'24',44,43,1,800.00,'Platinum',4,1,8,'TI-24-43-1',80,'2026-09-19 07:53:17'),(37,'24',44,42,2,200.00,'Platinum',4,1,8,'TI-24-42-2',81,'2026-09-19 07:53:17'),(38,'24',44,41,3,200.00,'Platinum',4,1,8,'TI-24-41-3',82,'2026-09-19 07:53:17'),(39,'24',44,40,4,80.00,'Platinum',4,1,8,'TI-24-40-4',83,'2026-09-19 07:53:17'),(40,'24',44,39,5,80.00,'Platinum',4,1,8,'TI-24-39-5',84,'2026-09-19 07:53:17'),(41,'24',44,38,6,80.00,'Platinum',4,1,8,'TI-24-38-6',85,'2026-09-19 07:53:17'),(42,'24',44,37,7,80.00,'Platinum',4,1,8,'TI-24-37-7',86,'2026-09-19 07:53:17'),(43,'25',45,44,1,800.00,'Platinum',4,1,8,'TI-25-44-1',89,'2026-09-19 07:53:17'),(44,'25',45,43,2,200.00,'Platinum',4,1,8,'TI-25-43-2',90,'2026-09-19 07:53:17'),(45,'25',45,42,3,200.00,'Platinum',4,1,8,'TI-25-42-3',91,'2026-09-19 07:53:17'),(46,'25',45,41,4,80.00,'Platinum',4,1,8,'TI-25-41-4',92,'2026-09-19 07:53:17'),(47,'25',45,40,5,80.00,'Platinum',4,1,8,'TI-25-40-5',93,'2026-09-19 07:53:17'),(48,'25',45,39,6,80.00,'Platinum',4,1,8,'TI-25-39-6',94,'2026-09-19 07:53:17'),(49,'25',45,38,7,80.00,'Platinum',4,1,8,'TI-25-38-7',95,'2026-09-19 07:53:17'),(50,'25',45,37,8,120.00,'Platinum',4,1,8,'TI-25-37-8',96,'2026-09-19 07:53:17'),(51,'26',46,45,1,800.00,'Platinum',4,1,8,'TI-26-45-1',99,'2026-09-19 07:53:17'),(52,'26',46,44,2,200.00,'Platinum',4,1,8,'TI-26-44-2',100,'2026-09-19 07:53:17'),(53,'26',46,43,3,200.00,'Platinum',4,1,8,'TI-26-43-3',101,'2026-09-19 07:53:17'),(54,'26',46,42,4,80.00,'Platinum',4,1,8,'TI-26-42-4',102,'2026-09-19 07:53:17'),(55,'26',46,41,5,80.00,'Platinum',4,1,8,'TI-26-41-5',103,'2026-09-19 07:53:17'),(56,'26',46,40,6,80.00,'Platinum',4,1,8,'TI-26-40-6',104,'2026-09-19 07:53:17'),(57,'26',46,39,7,80.00,'Platinum',4,1,8,'TI-26-39-7',105,'2026-09-19 07:53:17'),(58,'26',46,38,8,120.00,'Platinum',4,1,8,'TI-26-38-8',106,'2026-09-19 07:53:17'),(59,'27',47,46,1,800.00,'Platinum',4,1,8,'TI-27-46-1',109,'2026-09-19 07:53:18'),(60,'27',47,45,2,200.00,'Platinum',4,1,8,'TI-27-45-2',110,'2026-09-19 07:53:18'),(61,'27',47,44,3,200.00,'Platinum',4,1,8,'TI-27-44-3',111,'2026-09-19 07:53:18'),(62,'27',47,43,4,80.00,'Platinum',4,1,8,'TI-27-43-4',112,'2026-09-19 07:53:18'),(63,'27',47,42,5,80.00,'Platinum',4,1,8,'TI-27-42-5',113,'2026-09-19 07:53:18'),(64,'27',47,41,6,80.00,'Platinum',4,1,8,'TI-27-41-6',114,'2026-09-19 07:53:18'),(65,'27',47,40,7,80.00,'Platinum',4,1,8,'TI-27-40-7',115,'2026-09-19 07:53:18'),(66,'27',47,39,8,120.00,'Platinum',4,1,8,'TI-27-39-8',116,'2026-09-19 07:53:18'),(67,'28',48,28,1,100.00,'Star',1,2,8,'TI-28-28-1',120,'2026-09-19 08:23:45'),(68,'29',49,37,1,100.00,'Star',1,2,8,'TI-29-37-1',123,'2026-09-19 10:13:37'),(69,'30',49,37,1,200.00,'Silver',2,2,8,'TI-30-37-1',125,'2026-09-19 10:14:40'),(70,'31',49,37,1,400.00,'Gold',3,2,8,'TI-31-37-1',127,'2026-09-19 10:14:40'),(71,'32',49,37,1,800.00,'Platinum',4,2,8,'TI-32-37-1',129,'2026-09-19 10:14:40');
/*!40000 ALTER TABLE `team_income_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_messages`
--

DROP TABLE IF EXISTS `ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_type` enum('user','admin') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_messages`
--

LOCK TABLES `ticket_messages` WRITE;
/*!40000 ALTER TABLE `ticket_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_kyc`
--

DROP TABLE IF EXISTS `user_kyc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_kyc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(20) NOT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `nominee_name` varchar(100) DEFAULT NULL,
  `nominee_relation` varchar(50) DEFAULT NULL,
  `kyc_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_kyc`
--

LOCK TABLES `user_kyc` WRITE;
/*!40000 ALTER TABLE `user_kyc` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_kyc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_stats`
--

DROP TABLE IF EXISTS `user_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `has_active_package` tinyint(1) DEFAULT NULL,
  `total_referrals` bigint(21) DEFAULT NULL,
  `active_referrals` bigint(21) DEFAULT NULL,
  `wallet_balance` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_stats`
--

LOCK TABLES `user_stats` WRITE;
/*!40000 ALTER TABLE `user_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mobile` varchar(15) NOT NULL,
  `state` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gst_number` varchar(15) DEFAULT NULL,
  `gst_status` enum('pending','approved','','') DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `pan_number` varchar(10) DEFAULT NULL,
  `pan_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `referral_code` varchar(20) NOT NULL,
  `referred_by` int(11) DEFAULT NULL,
  `has_active_package` tinyint(1) DEFAULT 0,
  `rank_name` varchar(50) DEFAULT NULL,
  `current_product_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `role` enum('user','admin') DEFAULT 'user',
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_users_rank` (`rank_name`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','admin@blisswell.com','9999999999',NULL,NULL,NULL,NULL,NULL,'$2a$10$riwNeFmXwW3NnVRSoE5ZrumSdu7W.iuuOKySiMphyBdcnuZoyJwXG','AAAAA0000A','approved','ADMIN001',NULL,0,NULL,NULL,1,'admin',NULL,NULL,'2026-02-27 07:43:53','2026-09-16 06:28:44'),(28,'TestA','testa@test.com','9000000001','Maharashtra','Addr A',NULL,NULL,NULL,'$2a$10$19LtzR6CpT6RyyE6nINysOOuqu9ZzIahHo8tX2zWdP4CZa9.2JIP2','ABCDE1234F','pending','BSW255533',1,1,'Silver',2,1,'user',NULL,NULL,'2026-09-16 06:23:38','2026-09-19 11:16:23'),(29,'TestB','testb@test.com','9000000002','Maharashtra','Addr B',NULL,NULL,NULL,'$2a$10$KukgToCLPCbGuUMUsixdZe7/DPw0bT6zwuQaVTn/9InGCBKXaBOPq','ABCDE1235F','pending','BSW541871',28,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-16 06:23:39','2026-09-16 06:36:14'),(30,'TestC','testc@test.com','9000000003','Maharashtra','Addr C',NULL,NULL,NULL,'$2a$10$lHQCt0sWfuTu634DyN49ouM8mcL7nn9464crFPwK/FYmh26My1T5y','ABCDE1236F','pending','BSW678150',29,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-16 06:23:39','2026-09-16 06:35:28'),(31,'Ukvalley Technologies','ashishshinde@gmail.com','9511734147','Maharashtra','aaa',NULL,NULL,NULL,'$2a$10$7CcA8D.OncB1DHsA4HMtgur/hB/mTRY/BAUd9dWkvazk2d37e7eRu','MKSPS7373H','pending','BSW528584',1,1,'Star',1,1,'user',NULL,NULL,'2026-09-18 07:49:51','2026-09-18 07:52:35'),(37,'BW Test Root','root@bwtest.example.com','9000000000','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1000Q','approved','BWTROOT01',NULL,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(38,'BW Test L1','l1@bwtest.example.com','9000000001','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1001Q','approved','BWTL01',37,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(39,'BW Test L2','l2@bwtest.example.com','9000000002','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1002Q','approved','BWTL02',38,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(40,'BW Test L3','l3@bwtest.example.com','9000000003','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1003Q','approved','BWTL03',39,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(41,'BW Test L4','l4@bwtest.example.com','9000000004','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1004Q','approved','BWTL04',40,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(42,'BW Test L5','l5@bwtest.example.com','9000000005','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1005Q','approved','BWTL05',41,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(43,'BW Test L6','l6@bwtest.example.com','9000000006','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1006Q','approved','BWTL06',42,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(44,'BW Test L7','l7@bwtest.example.com','9000000007','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1007Q','approved','BWTL07',43,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(45,'BW Test L8','l8@bwtest.example.com','9000000008','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1008Q','approved','BWTL08',44,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(46,'BW Test L9','l9@bwtest.example.com','9000000009','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1009Q','approved','BWTL09',45,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:17'),(47,'BW Test L10','l10@bwtest.example.com','9000000010','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$bv3.DfsyqsXBjQtyxmVGTO6QZtvs3Lnv75Xzt2vqy6VNfHxz0x7x2','AAACP1010Q','approved','BWTL10',46,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 07:53:17','2026-09-19 07:53:18'),(48,'test ashish','admin@zaminex.local','9999898980','Maharashtra','asd',NULL,NULL,NULL,'$2a$10$o5JxaE8vl.yzZGZpzOZiD.8hAj6rSyBllVYxsDJgXpo3E0Os4mEJa','MKSPS7373L','pending','BSW069891',28,1,'Star',1,1,'user',NULL,NULL,'2026-09-19 08:22:19','2026-09-19 08:23:45'),(49,'BW Repurchase Test','reptest@bwtest.example.com','9000000999','Maharashtra','Test Chain Address, Nashik',NULL,NULL,NULL,'$2a$10$OYPMGJ2Xk.Kq/eVPL3v.s.aWmVAZ.leHyEuMVnkq0D5PFoojvZIXu','AAACP9999Q','approved','BWTRPT01',37,1,'Platinum',4,1,'user',NULL,NULL,'2026-09-19 10:13:37','2026-09-19 10:14:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('deposit','purchase','refund','bonus','incentive','self_cashback','team_income','withdrawal','withdrawal_reversal','repurchase') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `level` int(11) DEFAULT NULL,
  `source_user_id` int(11) DEFAULT NULL,
  `payment_id` varchar(100) DEFAULT NULL,
  `order_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'completed',
  `reference_key` varchar(64) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wt_ref` (`reference_key`),
  KEY `idx_wt_user_type` (`user_id`,`type`),
  KEY `idx_wt_source` (`source_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,30,'deposit',2000.00,NULL,NULL,NULL,NULL,'completed',NULL,'Test seed','2026-09-16 06:30:06'),(2,30,'purchase',-849.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Silver','2026-09-16 06:30:18'),(3,28,'deposit',1000.00,NULL,NULL,NULL,NULL,'completed',NULL,'Test seed A','2026-09-16 06:32:01'),(4,29,'deposit',1000.00,NULL,NULL,NULL,NULL,'completed',NULL,'Test seed B','2026-09-16 06:32:01'),(5,30,'deposit',2000.00,NULL,NULL,NULL,NULL,'completed',NULL,'Test seed C2','2026-09-16 06:32:01'),(6,28,'purchase',-349.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Star','2026-09-16 06:32:41'),(7,29,'purchase',-849.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Silver','2026-09-16 06:32:41'),(8,28,'team_income',200.00,1,29,NULL,NULL,'completed','TI-3-28-1','Team Income Level 1 from order #3 (Silver)','2026-09-16 06:32:41'),(9,30,'purchase',-1749.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Gold','2026-09-16 06:32:41'),(10,29,'team_income',400.00,1,30,NULL,NULL,'completed','TI-4-29-1','Team Income Level 1 from order #4 (Gold)','2026-09-16 06:32:41'),(11,28,'team_income',100.00,2,30,NULL,NULL,'completed','TI-4-28-2','Team Income Level 2 from order #4 (Gold)','2026-09-16 06:32:41'),(12,29,'withdrawal',-300.00,NULL,NULL,NULL,NULL,'completed','WD-29-a28ad5b3-826e-4a0e-b0da-5643449c97b3','Withdrawal request','2026-09-16 06:34:41'),(13,29,'repurchase',60.00,NULL,NULL,NULL,NULL,'completed','WRC-1','Repurchase wallet credit from withdrawal #1','2026-09-16 06:35:02'),(14,30,'repurchase',-4449.00,NULL,NULL,NULL,'5','completed','AR-30-4','Auto repurchase: Platinum (Platinum)','2026-09-16 06:35:28'),(15,29,'team_income',800.00,1,30,NULL,NULL,'completed','TI-5-29-1','Team Income Level 1 from order #5 (Platinum)','2026-09-16 06:35:28'),(16,28,'team_income',200.00,2,30,NULL,NULL,'completed','TI-5-28-2','Team Income Level 2 from order #5 (Platinum)','2026-09-16 06:35:28'),(17,29,'repurchase',-1749.00,NULL,NULL,NULL,'6','completed','AR-29-3','Auto repurchase: Gold (Gold)','2026-09-16 06:36:14'),(18,28,'team_income',400.00,1,29,NULL,NULL,'completed','TI-6-28-1','Team Income Level 1 from order #6 (Gold)','2026-09-16 06:36:14'),(19,29,'repurchase',-4449.00,NULL,NULL,NULL,'7','completed','AR-29-4','Auto repurchase: Platinum (Platinum)','2026-09-16 06:36:14'),(20,28,'team_income',800.00,1,29,NULL,NULL,'completed','TI-7-28-1','Team Income Level 1 from order #7 (Platinum)','2026-09-16 06:36:14'),(21,28,'withdrawal',-300.00,NULL,NULL,NULL,NULL,'failed','WD-28-084154df-b06d-4012-92ee-d9821995958c','Withdrawal request','2026-09-16 06:36:42'),(22,28,'withdrawal_reversal',300.00,NULL,NULL,NULL,NULL,'completed','WDR-2-e37e2a87-ca6c-4f09-be75-a684c537f8d1','Withdrawal #2 rejected: Test rejection','2026-09-16 06:36:42'),(23,28,'withdrawal',-300.00,NULL,NULL,NULL,NULL,'failed','WD-28-cd141247-7361-44be-9268-d29548cff81c','Withdrawal request','2026-09-16 06:37:02'),(24,28,'repurchase',60.00,NULL,NULL,NULL,NULL,'completed','WRC-3','Repurchase wallet credit from withdrawal #3','2026-09-16 06:37:02'),(25,28,'withdrawal_reversal',300.00,NULL,NULL,NULL,NULL,'completed','WDR-3-4ccea773-9b69-4c25-9e61-98a185131baf','Withdrawal #3 reversed','2026-09-16 06:37:02'),(26,28,'repurchase',-60.00,NULL,NULL,NULL,NULL,'completed','WRCR-3','Repurchase wallet claw-back from reversed withdrawal #3','2026-09-16 06:37:03'),(27,28,'purchase',349.00,NULL,NULL,'order_TdQ9gt4BWQQkpw','8','failed',NULL,'Payment cancelled: Star - User cancelled payment','2026-09-18 07:43:59'),(28,28,'purchase',349.00,NULL,NULL,'order_TdQ9y6YWI2aVEZ','9','failed',NULL,'Payment cancelled: Star - User cancelled payment','2026-09-18 07:44:15'),(29,29,'purchase',349.00,NULL,NULL,'order_TdQDucBN1SSOFU','10','failed',NULL,'Payment initiated: Star','2026-09-18 07:47:59'),(30,31,'purchase',-349.00,NULL,NULL,'pay_TdQIQkPe8zLB4I','11','completed',NULL,'Purchase: Star','2026-09-18 07:51:35'),(43,37,'deposit',10000.00,NULL,NULL,'TESTSEED-37',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(44,37,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(45,38,'deposit',10000.00,NULL,NULL,'TESTSEED-38',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(46,38,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(47,37,'team_income',800.00,1,38,NULL,NULL,'completed','TI-18-37-1','Team Income Level 1 from order #18 (Platinum)','2026-09-19 07:53:17'),(48,39,'deposit',10000.00,NULL,NULL,'TESTSEED-39',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(49,39,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(50,38,'team_income',800.00,1,39,NULL,NULL,'completed','TI-19-38-1','Team Income Level 1 from order #19 (Platinum)','2026-09-19 07:53:17'),(51,37,'team_income',200.00,2,39,NULL,NULL,'completed','TI-19-37-2','Team Income Level 2 from order #19 (Platinum)','2026-09-19 07:53:17'),(52,40,'deposit',10000.00,NULL,NULL,'TESTSEED-40',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(53,40,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(54,39,'team_income',800.00,1,40,NULL,NULL,'completed','TI-20-39-1','Team Income Level 1 from order #20 (Platinum)','2026-09-19 07:53:17'),(55,38,'team_income',200.00,2,40,NULL,NULL,'completed','TI-20-38-2','Team Income Level 2 from order #20 (Platinum)','2026-09-19 07:53:17'),(56,37,'team_income',200.00,3,40,NULL,NULL,'completed','TI-20-37-3','Team Income Level 3 from order #20 (Platinum)','2026-09-19 07:53:17'),(57,41,'deposit',10000.00,NULL,NULL,'TESTSEED-41',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(58,41,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(59,40,'team_income',800.00,1,41,NULL,NULL,'completed','TI-21-40-1','Team Income Level 1 from order #21 (Platinum)','2026-09-19 07:53:17'),(60,39,'team_income',200.00,2,41,NULL,NULL,'completed','TI-21-39-2','Team Income Level 2 from order #21 (Platinum)','2026-09-19 07:53:17'),(61,38,'team_income',200.00,3,41,NULL,NULL,'completed','TI-21-38-3','Team Income Level 3 from order #21 (Platinum)','2026-09-19 07:53:17'),(62,37,'team_income',80.00,4,41,NULL,NULL,'completed','TI-21-37-4','Team Income Level 4 from order #21 (Platinum)','2026-09-19 07:53:17'),(63,42,'deposit',10000.00,NULL,NULL,'TESTSEED-42',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(64,42,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(65,41,'team_income',800.00,1,42,NULL,NULL,'completed','TI-22-41-1','Team Income Level 1 from order #22 (Platinum)','2026-09-19 07:53:17'),(66,40,'team_income',200.00,2,42,NULL,NULL,'completed','TI-22-40-2','Team Income Level 2 from order #22 (Platinum)','2026-09-19 07:53:17'),(67,39,'team_income',200.00,3,42,NULL,NULL,'completed','TI-22-39-3','Team Income Level 3 from order #22 (Platinum)','2026-09-19 07:53:17'),(68,38,'team_income',80.00,4,42,NULL,NULL,'completed','TI-22-38-4','Team Income Level 4 from order #22 (Platinum)','2026-09-19 07:53:17'),(69,37,'team_income',80.00,5,42,NULL,NULL,'completed','TI-22-37-5','Team Income Level 5 from order #22 (Platinum)','2026-09-19 07:53:17'),(70,43,'deposit',10000.00,NULL,NULL,'TESTSEED-43',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(71,43,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(72,42,'team_income',800.00,1,43,NULL,NULL,'completed','TI-23-42-1','Team Income Level 1 from order #23 (Platinum)','2026-09-19 07:53:17'),(73,41,'team_income',200.00,2,43,NULL,NULL,'completed','TI-23-41-2','Team Income Level 2 from order #23 (Platinum)','2026-09-19 07:53:17'),(74,40,'team_income',200.00,3,43,NULL,NULL,'completed','TI-23-40-3','Team Income Level 3 from order #23 (Platinum)','2026-09-19 07:53:17'),(75,39,'team_income',80.00,4,43,NULL,NULL,'completed','TI-23-39-4','Team Income Level 4 from order #23 (Platinum)','2026-09-19 07:53:17'),(76,38,'team_income',80.00,5,43,NULL,NULL,'completed','TI-23-38-5','Team Income Level 5 from order #23 (Platinum)','2026-09-19 07:53:17'),(77,37,'team_income',80.00,6,43,NULL,NULL,'completed','TI-23-37-6','Team Income Level 6 from order #23 (Platinum)','2026-09-19 07:53:17'),(78,44,'deposit',10000.00,NULL,NULL,'TESTSEED-44',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(79,44,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(80,43,'team_income',800.00,1,44,NULL,NULL,'completed','TI-24-43-1','Team Income Level 1 from order #24 (Platinum)','2026-09-19 07:53:17'),(81,42,'team_income',200.00,2,44,NULL,NULL,'completed','TI-24-42-2','Team Income Level 2 from order #24 (Platinum)','2026-09-19 07:53:17'),(82,41,'team_income',200.00,3,44,NULL,NULL,'completed','TI-24-41-3','Team Income Level 3 from order #24 (Platinum)','2026-09-19 07:53:17'),(83,40,'team_income',80.00,4,44,NULL,NULL,'completed','TI-24-40-4','Team Income Level 4 from order #24 (Platinum)','2026-09-19 07:53:17'),(84,39,'team_income',80.00,5,44,NULL,NULL,'completed','TI-24-39-5','Team Income Level 5 from order #24 (Platinum)','2026-09-19 07:53:17'),(85,38,'team_income',80.00,6,44,NULL,NULL,'completed','TI-24-38-6','Team Income Level 6 from order #24 (Platinum)','2026-09-19 07:53:17'),(86,37,'team_income',80.00,7,44,NULL,NULL,'completed','TI-24-37-7','Team Income Level 7 from order #24 (Platinum)','2026-09-19 07:53:17'),(87,45,'deposit',10000.00,NULL,NULL,'TESTSEED-45',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(88,45,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(89,44,'team_income',800.00,1,45,NULL,NULL,'completed','TI-25-44-1','Team Income Level 1 from order #25 (Platinum)','2026-09-19 07:53:17'),(90,43,'team_income',200.00,2,45,NULL,NULL,'completed','TI-25-43-2','Team Income Level 2 from order #25 (Platinum)','2026-09-19 07:53:17'),(91,42,'team_income',200.00,3,45,NULL,NULL,'completed','TI-25-42-3','Team Income Level 3 from order #25 (Platinum)','2026-09-19 07:53:17'),(92,41,'team_income',80.00,4,45,NULL,NULL,'completed','TI-25-41-4','Team Income Level 4 from order #25 (Platinum)','2026-09-19 07:53:17'),(93,40,'team_income',80.00,5,45,NULL,NULL,'completed','TI-25-40-5','Team Income Level 5 from order #25 (Platinum)','2026-09-19 07:53:17'),(94,39,'team_income',80.00,6,45,NULL,NULL,'completed','TI-25-39-6','Team Income Level 6 from order #25 (Platinum)','2026-09-19 07:53:17'),(95,38,'team_income',80.00,7,45,NULL,NULL,'completed','TI-25-38-7','Team Income Level 7 from order #25 (Platinum)','2026-09-19 07:53:17'),(96,37,'team_income',120.00,8,45,NULL,NULL,'completed','TI-25-37-8','Team Income Level 8 from order #25 (Platinum)','2026-09-19 07:53:17'),(97,46,'deposit',10000.00,NULL,NULL,'TESTSEED-46',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:17'),(98,46,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:17'),(99,45,'team_income',800.00,1,46,NULL,NULL,'completed','TI-26-45-1','Team Income Level 1 from order #26 (Platinum)','2026-09-19 07:53:17'),(100,44,'team_income',200.00,2,46,NULL,NULL,'completed','TI-26-44-2','Team Income Level 2 from order #26 (Platinum)','2026-09-19 07:53:17'),(101,43,'team_income',200.00,3,46,NULL,NULL,'completed','TI-26-43-3','Team Income Level 3 from order #26 (Platinum)','2026-09-19 07:53:17'),(102,42,'team_income',80.00,4,46,NULL,NULL,'completed','TI-26-42-4','Team Income Level 4 from order #26 (Platinum)','2026-09-19 07:53:17'),(103,41,'team_income',80.00,5,46,NULL,NULL,'completed','TI-26-41-5','Team Income Level 5 from order #26 (Platinum)','2026-09-19 07:53:17'),(104,40,'team_income',80.00,6,46,NULL,NULL,'completed','TI-26-40-6','Team Income Level 6 from order #26 (Platinum)','2026-09-19 07:53:17'),(105,39,'team_income',80.00,7,46,NULL,NULL,'completed','TI-26-39-7','Team Income Level 7 from order #26 (Platinum)','2026-09-19 07:53:17'),(106,38,'team_income',120.00,8,46,NULL,NULL,'completed','TI-26-38-8','Team Income Level 8 from order #26 (Platinum)','2026-09-19 07:53:17'),(107,47,'deposit',10000.00,NULL,NULL,'TESTSEED-47',NULL,'completed',NULL,'Test chain seed deposit','2026-09-19 07:53:18'),(108,47,'purchase',-4449.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Platinum','2026-09-19 07:53:18'),(109,46,'team_income',800.00,1,47,NULL,NULL,'completed','TI-27-46-1','Team Income Level 1 from order #27 (Platinum)','2026-09-19 07:53:18'),(110,45,'team_income',200.00,2,47,NULL,NULL,'completed','TI-27-45-2','Team Income Level 2 from order #27 (Platinum)','2026-09-19 07:53:18'),(111,44,'team_income',200.00,3,47,NULL,NULL,'completed','TI-27-44-3','Team Income Level 3 from order #27 (Platinum)','2026-09-19 07:53:18'),(112,43,'team_income',80.00,4,47,NULL,NULL,'completed','TI-27-43-4','Team Income Level 4 from order #27 (Platinum)','2026-09-19 07:53:18'),(113,42,'team_income',80.00,5,47,NULL,NULL,'completed','TI-27-42-5','Team Income Level 5 from order #27 (Platinum)','2026-09-19 07:53:18'),(114,41,'team_income',80.00,6,47,NULL,NULL,'completed','TI-27-41-6','Team Income Level 6 from order #27 (Platinum)','2026-09-19 07:53:18'),(115,40,'team_income',80.00,7,47,NULL,NULL,'completed','TI-27-40-7','Team Income Level 7 from order #27 (Platinum)','2026-09-19 07:53:18'),(116,39,'team_income',120.00,8,47,NULL,NULL,'completed','TI-27-39-8','Team Income Level 8 from order #27 (Platinum)','2026-09-19 07:53:18'),(117,37,'withdrawal',-1000.00,NULL,NULL,NULL,NULL,'completed','WD-37-2bea08ae-09f6-4e01-a185-60e5fdf8f750','Withdrawal request','2026-09-19 07:59:28'),(118,37,'repurchase',200.00,NULL,NULL,NULL,NULL,'completed','WRC-4','Repurchase wallet credit from withdrawal #4','2026-09-19 08:04:25'),(119,48,'purchase',-349.00,NULL,NULL,'pay_TdpMSdCxB9q3ay','28','completed',NULL,'Purchase: Star','2026-09-19 08:23:00'),(120,28,'team_income',100.00,1,48,NULL,NULL,'completed','TI-28-28-1','Team Income Level 1 from order #28 (Star)','2026-09-19 08:23:45'),(121,49,'deposit',1000.00,NULL,NULL,'TESTSEED-RP-49',NULL,'completed',NULL,'Repurchase-test seed deposit','2026-09-19 10:13:37'),(122,49,'purchase',-349.00,NULL,NULL,NULL,NULL,'completed',NULL,'Purchase: Star','2026-09-19 10:13:37'),(123,37,'team_income',100.00,1,49,NULL,NULL,'completed','TI-29-37-1','Team Income Level 1 from order #29 (Star)','2026-09-19 10:13:37'),(124,49,'repurchase',-849.00,NULL,NULL,NULL,'30','completed','AR-49-2','Auto repurchase: Silver (Silver)','2026-09-19 10:14:40'),(125,37,'team_income',200.00,1,49,NULL,NULL,'completed','TI-30-37-1','Team Income Level 1 from order #30 (Silver)','2026-09-19 10:14:40'),(126,49,'repurchase',-1749.00,NULL,NULL,NULL,'31','completed','AR-49-3','Auto repurchase: Gold (Gold)','2026-09-19 10:14:40'),(127,37,'team_income',400.00,1,49,NULL,NULL,'completed','TI-31-37-1','Team Income Level 1 from order #31 (Gold)','2026-09-19 10:14:40'),(128,49,'repurchase',-4449.00,NULL,NULL,NULL,'32','completed','AR-49-4','Auto repurchase: Platinum (Platinum)','2026-09-19 10:14:40'),(129,37,'team_income',800.00,1,49,NULL,NULL,'completed','TI-32-37-1','Team Income Level 1 from order #32 (Platinum)','2026-09-19 10:14:40'),(133,28,'withdrawal',-4250.00,NULL,NULL,NULL,NULL,'completed','WD-28-d8a109bb-4e2a-48f2-805d-366e5e71185e','Withdrawal request','2026-09-19 11:15:26'),(134,28,'repurchase',850.00,NULL,NULL,NULL,NULL,'completed','WRC-5','Repurchase wallet credit from withdrawal #5','2026-09-19 11:15:35'),(135,28,'withdrawal',-200.00,NULL,NULL,NULL,NULL,'completed','WD-28-b953206d-1525-45dd-88aa-0f63a12745c7','Withdrawal request','2026-09-19 11:16:19'),(136,28,'repurchase',40.00,NULL,NULL,NULL,NULL,'completed','WRC-6','Repurchase wallet credit from withdrawal #6','2026-09-19 11:16:23'),(137,28,'repurchase',-849.00,NULL,NULL,NULL,'36','completed','AR-28-2','Auto repurchase: Silver (Silver)','2026-09-19 11:16:23');
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `balance` decimal(12,2) DEFAULT 0.00,
  `earnings_balance` decimal(12,2) DEFAULT 0.00,
  `repurchase_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES (1,1,0.00,0.00,0.00,'2026-09-16 06:20:57','2026-09-16 06:20:57'),(2,28,651.00,550.00,41.00,'2026-09-16 06:23:38','2026-09-19 11:16:23'),(3,29,151.00,900.00,2802.00,'2026-09-16 06:23:39','2026-09-16 06:36:14'),(4,30,1402.00,0.00,551.00,'2026-09-16 06:23:39','2026-09-16 06:35:28'),(5,31,0.00,0.00,0.00,'2026-09-18 07:49:51','2026-09-18 07:49:51'),(14,37,5551.00,2140.00,200.00,'2026-09-19 07:53:17','2026-09-19 10:14:40'),(15,38,5551.00,1640.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(16,39,5551.00,1640.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(17,40,5551.00,1520.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(18,41,5551.00,1440.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(19,42,5551.00,1360.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(20,43,5551.00,1280.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(21,44,5551.00,1200.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(22,45,5551.00,1000.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(23,46,5551.00,800.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(24,47,5551.00,0.00,0.00,'2026-09-19 07:53:17','2026-09-19 07:53:41'),(25,48,0.00,0.00,0.00,'2026-09-19 08:22:19','2026-09-19 08:22:19'),(26,49,651.00,0.00,53.00,'2026-09-19 10:13:37','2026-09-19 10:14:40');
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `withdrawal_requests`
--

DROP TABLE IF EXISTS `withdrawal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `withdrawal_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `admin_charge` decimal(12,2) NOT NULL DEFAULT 0.00,
  `repurchase_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payout_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','processed','rejected','reversed') NOT NULL DEFAULT 'pending',
  `transaction_id` int(11) DEFAULT NULL,
  `reversal_transaction_id` int(11) DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `reject_reason` varchar(255) DEFAULT NULL,
  `reference_key` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wr_ref` (`reference_key`),
  KEY `idx_wr_user_status` (`user_id`,`status`),
  KEY `idx_wr_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_requests`
--

LOCK TABLES `withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `withdrawal_requests` DISABLE KEYS */;
INSERT INTO `withdrawal_requests` VALUES (1,29,300.00,15.00,60.00,225.00,'processed',12,NULL,1,'2026-09-16 06:35:02',NULL,'WD-29-a28ad5b3-826e-4a0e-b0da-5643449c97b3','2026-09-16 06:34:41','2026-09-16 06:35:02'),(2,28,300.00,0.00,0.00,0.00,'rejected',21,22,1,'2026-09-16 06:36:42','Test rejection','WD-28-084154df-b06d-4012-92ee-d9821995958c','2026-09-16 06:36:42','2026-09-16 06:36:42'),(3,28,300.00,15.00,60.00,225.00,'reversed',23,25,1,'2026-09-16 06:37:03',NULL,'WD-28-cd141247-7361-44be-9268-d29548cff81c','2026-09-16 06:37:02','2026-09-16 06:37:03'),(4,37,1000.00,50.00,200.00,750.00,'processed',117,NULL,1,'2026-09-19 08:04:25',NULL,'WD-37-2bea08ae-09f6-4e01-a185-60e5fdf8f750','2026-09-19 07:59:28','2026-09-19 08:04:25'),(5,28,4250.00,212.50,850.00,3187.50,'processed',133,NULL,1,'2026-09-19 11:15:35',NULL,'WD-28-d8a109bb-4e2a-48f2-805d-366e5e71185e','2026-09-19 11:15:26','2026-09-19 11:15:35'),(6,28,200.00,10.00,40.00,150.00,'processed',135,NULL,1,'2026-09-19 11:16:23',NULL,'WD-28-b953206d-1525-45dd-88aa-0f63a12745c7','2026-09-19 11:16:19','2026-09-19 11:16:23');
/*!40000 ALTER TABLE `withdrawal_requests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-22 12:16:21
