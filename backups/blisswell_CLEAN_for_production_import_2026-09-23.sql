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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
-- Table structure for table `invoice_counter`
--

DROP TABLE IF EXISTS `invoice_counter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_counter` (
  `id` tinyint(4) NOT NULL CHECK (`id` = 1),
  `next_seq` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_counter`
--

LOCK TABLES `invoice_counter` WRITE;
/*!40000 ALTER TABLE `invoice_counter` DISABLE KEYS */;
INSERT INTO `invoice_counter` VALUES (1,1);
/*!40000 ALTER TABLE `invoice_counter` ENABLE KEYS */;
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
  `design_name` varchar(100) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_type` enum('wallet','razorpay','repurchase_wallet') DEFAULT 'wallet',
  `status` enum('pending','processing','shipped','delivered','cancelled','failed') DEFAULT 'pending',
  `order_source` enum('user','auto_repurchase') NOT NULL DEFAULT 'user',
  `source_withdrawal_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_orders_source` (`order_source`),
  KEY `idx_orders_src_wd` (`source_withdrawal_id`),
  KEY `idx_orders_user` (`user_id`,`status`),
  KEY `idx_orders_status_created` (`status`,`created_at`),
  KEY `idx_orders_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
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
  `designs` text DEFAULT NULL,
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
INSERT INTO `products` VALUES (1,'Star','Star','[100,25,25,10,10,10,10,15,15,15]',1,'Star Rank package. Activates your account and unlocks the Star level income table levels 1..10 for your upline.',349.00,100.00,12,0.00,0,NULL,NULL,NULL,NULL,1,'2026-09-23 11:47:45','2026-09-23 11:47:45'),(2,'Silver','Silver','[200,50,50,20,20,20,20,30,30,30]',2,'Silver Rank package. Activates your account and unlocks the Silver level income table levels 1..10 for your upline.',849.00,100.00,12,0.00,0,NULL,NULL,NULL,NULL,1,'2026-09-23 11:47:45','2026-09-23 11:47:45'),(3,'Gold','Gold','[400,100,100,40,40,40,40,0,0,0]',3,'Gold Rank package. Activates your account and unlocks the Gold level income table levels 1..10 for your upline.',1749.00,100.00,12,0.00,0,NULL,NULL,NULL,NULL,1,'2026-09-23 11:47:45','2026-09-23 11:47:45'),(4,'Platinum','Platinum','[800,200,200,80,80,80,80,120,120,120]',4,'Platinum Rank package. Activates your account and unlocks the Platinum level income table levels 1..10 for your upline.',4449.00,100.00,12,0.00,0,NULL,NULL,NULL,NULL,1,'2026-09-23 11:47:45','2026-09-23 11:47:45');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `setting_audit_logs`
--

LOCK TABLES `setting_audit_logs` WRITE;
/*!40000 ALTER TABLE `setting_audit_logs` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (5,'repurchase_enabled','true','Allow repurchase of package','2026-02-27 07:43:53','2026-02-27 07:43:53'),(6,'site_logo','/uploads/logos/logo-1777870561375-680335915.png',NULL,'2026-03-03 05:26:52','2026-05-04 04:56:01'),(7,'site_name','Blisswell',NULL,'2026-03-03 05:48:21','2026-03-03 05:48:21'),(8,'site_tagline','Premium Bedsheets',NULL,'2026-03-03 05:48:21','2026-03-03 05:48:21'),(9,'contact_phone','+919011166599',NULL,'2026-03-03 05:48:21','2026-04-09 09:15:25'),(10,'contact_email','blisswellenterprises@gmail.com',NULL,'2026-03-03 05:48:21','2026-04-22 06:56:22'),(11,'contact_address','Name- Blisswell enterprises Address- 4th floor, A-409, Business Plaza,Surat nashik highway,Panchawati,Nashik Maharashtra- 422003\n',NULL,'2026-03-03 05:48:21','2026-05-07 06:19:13'),(12,'social_facebook','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(13,'social_instagram','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(14,'social_twitter','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(15,'social_linkedin','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(16,'social_youtube','',NULL,'2026-03-03 05:48:21','2026-03-21 10:26:35'),(17,'terms_and_conditions','BLISSWELL ENTERPRISES\nRecurring Affiliate Marketing Legal Agreement \n\nCompany Details - BLISSWELL ENTERPRISES \nAddress- Shop no A+409, Business Plaza, landmark ,  Panchavati, Distict - nashik \nState - Maharashtra \nPin code - 422003\nGST number- 27ANJPC4891P1ZB\n\nBusiness Plan Summary-\nBy registering, you agreed to our terms of service and privacy policy. You acknowledge that the Affiliate program is subject to the company\'s terms and conditions. \n\n1) The Company hereby appoints the Affiliate partner to promote and sell the Company’s products through affiliate marketing.\nThe affiliate partner accepts this appointment and agrees to operate according to the policies and procedures of the Company.\n\n2) The affiliate partner is an independent contractor and not an employee, partner, or agent of the Company.\nThe Affiliate partner shall not represent themselves as an employee or official representative of the Company.\n\n3) To become a Affiliate partner, The individual must be at least 18 years old.\nValid KYC documents must be submitted.\nThe individual must agree to all company policies and procedures.\n\n4) The Affiliate partner may purchase products from the Company at the official price determined by the Company.\nThe Company reserves the right to change product prices at any time.\n\n5)  The Company will pay commissions and incentives based on the approved compensation plan.\nAll affiliate commission are subject to verification of valid sales transactions.\n\n6)  bonuses will be credited to the Affiliate partner wallet/account.\nPayouts will be processed according to the company payout schedule, typically on every month.\nThe Company may deduct applicable taxes (TDS/GST) as per government regulations.\n\n7)  Promote the Company’s products honestly and ethically.\nNot make false or misleading income claims ,Not misrepresent the Company or its products.\nFollow all marketing and promotional guidelines issued by the Company.\nViolation of these rules may result in suspension or termination of the Affiliate partner ID.\n\n8)  Customers may return products within the Company’s return policy period (usually 7 days from delivery) if the product is unused and in original condition.\nRefunds will be processed according to the Company’s refund policy.\n\n9) The affiliate partner agrees not to disclose confidential information of the Company, including business plans, pricing structures, and marketing strategies.\n\n10) The Company reserves the right to terminate the Affiliate partner account if Fraudulent or illegal activities are detected.\nCompany policies are violated.\nMisrepresentation of products or income occurs.\nThe affiliate partner may also terminate this agreement by providing written notice to the Company.\n\n11) The Company shall not be liable for any indirect or consequential losses incurred by the affiliate partner.\nIncome depends on individual effort, sales performance, and market conditions.\n\n12) This Agreement shall be governed by the laws of India and applicable regulations related to affiliate marketing.\n\n13) The affiliate partner confirms that they have read, understood, and agreed to all the terms and conditions mentioned above.\n\nBusiness plan summary -\n\n1. Nature of Business - This is Product affiliate marketing program. Earning are solely based on product sales.\n\n2. Incentive Terms-\nIncentives are distributed over 6 months subject to valid sales and no refunded cases.\n\n3. Compliance-\nThis plan complies affiliate marketing Rules and is not a money circulation scheme.\n\n4. Payment Terms-\nPayment will be processed monthly after verification transactions.\n\n5. Termination-\nCompany reserves the right to terminate accounts in case of fraud or policy violation.\n\n6. Refund Policy-\nIn case of refund , related incentives will be cancelled.\n\n7. Legal jurisdiction-\nAll disputes are subject to jurisdiction of local courts in Maharashtra, India.',NULL,'2026-03-10 11:38:32','2026-07-12 09:57:19'),(28,'self_cashback_enabled','true','Self Cashback master on/off switch','2026-09-03 06:39:25','2026-09-03 06:39:25'),(29,'self_cashback_amount_per_claim','10','Amount credited per self-cashback claim (Ôé╣)','2026-09-03 06:39:25','2026-09-03 07:04:52'),(30,'self_cashback_max_claims','20','Maximum claims per entitlement','2026-09-03 06:39:25','2026-09-03 06:39:25'),(41,'qualification_levels_per_direct','2','Max levels unlocked per qualified direct','2026-09-03 06:39:25','2026-09-03 06:39:25'),(42,'qualification_max_levels','10','Hard cap on unlocked levels','2026-09-03 06:39:25','2026-09-22 07:56:53'),(43,'withdrawal_min_amount','200','Minimum withdrawal amount (Ôé╣)','2026-09-03 06:39:25','2026-09-03 06:39:25'),(44,'withdrawal_start_time','07:00','Withdrawal window start (IST, 24h)','2026-09-03 06:39:25','2026-09-22 08:49:52'),(45,'withdrawal_end_time','10:00','Withdrawal window end (IST, 24h)','2026-09-03 06:39:25','2026-09-22 08:49:52'),(46,'withdrawal_timezone','Asia/Kolkata','Timezone for withdrawal window / server time','2026-09-03 06:39:25','2026-09-03 06:39:25'),(95,'withdrawal_admin_charge_percent','5','Admin charge percent on withdrawal processing (%)','2026-09-16 06:20:57','2026-09-16 06:20:57'),(96,'repurchase_share_percent','20','Percent of withdrawal credited to repurchase wallet (%)','2026-09-16 06:20:57','2026-09-16 06:20:57'),(97,'auto_repurchase_enabled','true','Auto repurchase engine master switch','2026-09-16 06:20:57','2026-09-16 06:20:57');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_income_events`
--

LOCK TABLES `team_income_events` WRITE;
/*!40000 ALTER TABLE `team_income_events` DISABLE KEYS */;
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
  `pincode` varchar(10) DEFAULT NULL,
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
  KEY `idx_users_rank` (`rank_name`),
  KEY `idx_users_referred` (`referred_by`,`has_active_package`),
  KEY `idx_users_refcode` (`referral_code`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','admin@blisswell.com','9999999999',NULL,NULL,NULL,NULL,NULL,NULL,'$2a$10$riwNeFmXwW3NnVRSoE5ZrumSdu7W.iuuOKySiMphyBdcnuZoyJwXG','AAAAA0000A','approved','ADMIN001',NULL,0,NULL,NULL,1,'admin',NULL,NULL,'2026-02-27 07:43:53','2026-09-23 11:47:45');
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
  KEY `idx_wt_source` (`source_user_id`),
  KEY `idx_wt_payment` (`payment_id`),
  KEY `idx_wt_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
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
  PRIMARY KEY (`id`),
  KEY `idx_wallets_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES (1,1,0.00,0.00,0.00,'2026-09-23 11:47:45','2026-09-23 11:47:45');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_requests`
--

LOCK TABLES `withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `withdrawal_requests` DISABLE KEYS */;
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

-- Dump completed on 2026-09-23 17:22:06
