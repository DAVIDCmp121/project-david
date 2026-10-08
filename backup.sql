-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: polo_shop
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `admins`
--

/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'admin','$2b$10$WafrL5rSbauC7VmIbgKPIOP93acDtRKLrxUy8./hU01z6pidvuQ2S','DAVID ເຈົ້າຂອງຮ້ານ','admin',NULL),(6,'vid','$2b$10$FEIJjp60rmim3RKEaxGps.ynD1rExpbtqqs9P1uA49TEmphSyIfwC','vid','staff',NULL),(7,'aou','$2b$10$CJLLFQo14KYJEanBKGHh1.kU5baNvwqVOjO7XDj.fr95goNIFGKfe','aou','staff',NULL);
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;

--
-- Dumping data for table `customers`
--

/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'02012345678','$2b$10$GfVBAZx34WsTAuea3Ix3OuPExgx3UIKipaWCukinFswfPiN5ZN18q','Aouthin','2026-09-01 06:31:53'),(2,'2095007069','$2b$10$.6XCeDcn7k1Yy1XkYIUy/OMj10Tx/BDGhFD.1sGePbnvnwG8wUR26','2095007069','2026-09-02 03:01:16'),(3,'2095007061','$2b$10$njk8K.oaBe66HJIVV98k5uy2pc0IFNSMWdEOIYyhhxLADYe13/rDO','David','2026-09-02 03:01:55'),(4,'2029358569','$2b$10$5Tix49u6I1SDtuzQTpNVduV.8TmAfj1R98gt0ZM/BMnI4zGO.mX8i','aouthin','2026-09-04 01:55:18'),(5,'95007069','$2b$10$fSYXBeWk9YfpI7tYLDvaY.gxTZMYzhNOLCKwiNjCLmpDzqPJZcYZ2','95007069','2026-09-04 02:39:10'),(6,'12345678','$2b$10$5wLPsg.kvEtUevjgk2I46Oi3N9DHTfuJFOvrCyMZvTgiYP2QBNlJ6','dd','2026-09-08 07:40:44');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;

--
-- Dumping data for table `messages`
--

/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,'customer','????????? ?????????????????????',NULL,1,'2026-09-01 06:53:32'),(2,1,'admin','????????? ?????????????',NULL,1,'2026-09-01 06:55:05'),(3,1,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788246899/project-david/chat/p9xcllsl5sw7vsixpg29.png',1,'2026-09-01 07:15:00'),(4,1,'customer','ddd',NULL,1,'2026-09-01 08:34:09'),(5,1,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788251660/project-david/chat/f69czsye88donwb0zai2.jpg',1,'2026-09-01 08:34:21'),(6,1,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788251663/project-david/chat/rcu8crzbtdzc8el773pr.jpg',1,'2026-09-01 08:34:24'),(7,1,'customer','aaaa',NULL,1,'2026-09-01 08:34:41'),(8,1,'customer','david',NULL,1,'2026-09-01 08:35:30'),(9,1,'customer','ເຄື່ອງງາມຫລາຍ',NULL,1,'2026-09-01 08:35:43'),(10,1,'customer','ກ',NULL,1,'2026-09-01 08:36:24'),(11,1,'customer','ດ',NULL,1,'2026-09-01 08:36:26'),(12,1,'customer','ີ',NULL,1,'2026-09-01 08:36:27'),(13,1,'customer','ິ',NULL,1,'2026-09-01 08:36:29'),(14,1,'customer','ພຳເໄຶ',NULL,1,'2026-09-01 08:37:28'),(15,1,'customer','ເຄື່ອງງາມຫລາຍ',NULL,1,'2026-09-01 08:54:56'),(16,1,'admin','ຂອບໃຈເດີ',NULL,1,'2026-09-01 08:55:16'),(17,1,'customer','huhu',NULL,1,'2026-09-01 09:37:12'),(18,1,'admin','hello',NULL,1,'2026-09-02 01:46:40'),(19,1,'customer','hi',NULL,1,'2026-09-02 01:49:33'),(20,1,'customer','hi',NULL,1,'2026-09-02 02:46:03'),(21,3,'customer','kk',NULL,1,'2026-09-02 03:02:16'),(22,2,'customer','dd',NULL,1,'2026-09-02 03:23:25'),(23,2,'customer','ສັ່ງຊື້ໃໝ່:\nສນຄ້າ: CAP POLO\nຈຳນວນ: 1\nລວມ: 99000 ກີບ\nທີຢູ່ຈັດສົ່ງ: a',NULL,1,'2026-09-02 07:11:12'),(24,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: q',NULL,1,'2026-09-02 07:30:18'),(25,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 359000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: l',NULL,1,'2026-09-02 07:31:51'),(26,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: s',NULL,1,'2026-09-03 01:38:14'),(27,2,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788399496/project-david/chat/ht7sjitzqr9dey9nmk9s.jpg',1,'2026-09-03 01:38:18'),(28,2,'customer','d',NULL,1,'2026-09-03 02:15:40'),(29,2,'customer','sss',NULL,1,'2026-09-03 02:15:54'),(30,2,'customer','ssss',NULL,1,'2026-09-03 02:16:14'),(31,2,'customer','ddd',NULL,1,'2026-09-03 02:16:23'),(32,2,'customer','ddd',NULL,1,'2026-09-03 02:18:14'),(33,2,'customer','s',NULL,1,'2026-09-03 02:18:15'),(34,2,'customer','s',NULL,1,'2026-09-03 02:18:17'),(35,2,'customer','s',NULL,1,'2026-09-03 02:18:18'),(36,2,'admin','ssss',NULL,1,'2026-09-03 02:21:23'),(37,2,'customer','dd',NULL,1,'2026-09-03 02:21:34'),(38,2,'admin','dd',NULL,1,'2026-09-03 02:21:43'),(39,2,'admin','dd',NULL,1,'2026-09-03 02:22:55'),(40,2,'admin','ss',NULL,1,'2026-09-03 02:23:52'),(41,2,'admin','jj',NULL,1,'2026-09-03 02:24:47'),(42,2,'admin','ss',NULL,1,'2026-09-03 02:27:14'),(43,2,'customer','dd',NULL,1,'2026-09-03 02:31:10'),(44,2,'customer','dd',NULL,1,'2026-09-03 02:34:16'),(45,2,'admin','aa',NULL,1,'2026-09-03 02:34:42'),(46,2,'customer','ss',NULL,1,'2026-09-03 02:35:10'),(47,2,'admin','dd',NULL,1,'2026-09-03 02:35:16'),(48,2,'customer','dd',NULL,1,'2026-09-03 02:35:25'),(49,2,'admin','ss',NULL,1,'2026-09-03 02:35:32'),(50,2,'customer','ss',NULL,1,'2026-09-03 02:36:48'),(51,2,'admin','ss',NULL,1,'2026-09-03 02:36:58'),(52,2,'customer','aa',NULL,1,'2026-09-03 02:38:04'),(53,2,'admin','ss',NULL,1,'2026-09-03 02:38:16'),(54,2,'customer','ss',NULL,1,'2026-09-03 02:38:28'),(55,2,'admin','hh',NULL,1,'2026-09-03 02:38:57'),(56,2,'admin','dd',NULL,1,'2026-09-03 02:46:52'),(57,2,'customer','dd',NULL,1,'2026-09-03 02:47:08'),(58,2,'admin','aa',NULL,1,'2026-09-03 02:48:37'),(59,2,'customer','hh',NULL,1,'2026-09-03 02:48:46'),(60,2,'admin','jj',NULL,1,'2026-09-03 02:48:54'),(61,2,'customer','หห',NULL,1,'2026-09-03 06:12:15'),(62,2,'admin','กก',NULL,1,'2026-09-03 06:12:30'),(63,2,'customer','ดด',NULL,1,'2026-09-03 06:12:36'),(64,2,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788419052/project-david/chat/auxsin5v8dlpkzxufjzr.jpg',1,'2026-09-03 07:04:13'),(65,2,'admin','ໂດຍ ຂອບໃຈເດີ',NULL,1,'2026-09-03 07:05:33'),(66,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: w',NULL,1,'2026-09-03 08:39:46'),(67,2,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788424789/project-david/chat/fpzofkjotlnsbnwglvlv.jpg',1,'2026-09-03 08:39:50'),(68,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: a',NULL,1,'2026-09-04 01:25:53'),(69,2,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788485156/project-david/chat/cb92d4gsygspefi0byun.jpg',1,'2026-09-04 01:25:56'),(70,5,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: w',NULL,1,'2026-09-04 02:39:39'),(71,5,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1788489582/project-david/chat/v8nl77risqihx7mt1ikn.jpg',1,'2026-09-04 02:39:43'),(72,5,'customer','david',NULL,1,'2026-09-04 08:15:44'),(73,5,'admin','david',NULL,1,'2026-09-04 08:15:57'),(74,6,'customer','hi',NULL,1,'2026-09-08 07:40:55'),(75,6,'customer','dd',NULL,1,'2026-09-09 01:29:55'),(76,6,'admin','kk',NULL,1,'2026-09-09 01:31:37'),(77,2,'customer','kk',NULL,1,'2026-09-09 01:31:50'),(78,2,'admin','ll',NULL,1,'2026-09-09 01:32:26'),(79,2,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: dd',NULL,1,'2026-09-14 03:03:31'),(80,6,'admin','kk',NULL,0,'2026-09-15 06:51:44'),(81,2,'admin',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1789701815/project-david/chat/gzreithiwicknhz0z6wq.jpg',0,'2026-09-18 03:23:36'),(82,5,'customer','ສັ່ງຊື້ໃໝ່:\nສິນຄ້າ: POLO\nຈຳນວນ: 1\nລວມ: 459000 ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: jj',NULL,1,'2026-09-18 03:25:18'),(83,5,'customer',NULL,'https://res.cloudinary.com/pnfbkrwz/image/upload/v1789701920/project-david/chat/kwrpbz2t4b59sopkvova.jpg',1,'2026-09-18 03:25:21'),(84,5,'admin','dd',NULL,1,'2026-09-18 03:25:37'),(85,5,'customer','dd',NULL,1,'2026-09-18 03:25:45');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;

--
-- Dumping data for table `orders`
--

/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (4,18,1,'pending','2026-08-27 04:00:21',NULL,NULL,NULL,NULL,NULL,'awaiting_review',NULL),(5,17,1,'pending','2026-08-27 06:22:30',NULL,NULL,NULL,NULL,NULL,'awaiting_review',NULL),(8,17,1,'pending','2026-08-31 03:19:57','r','r','/uploads/slip_1788146397989.jpeg',NULL,NULL,'awaiting_review',NULL),(9,18,1,'pending','2026-08-31 03:22:28','w','s','/uploads/slip_1788146548626.jpeg',NULL,NULL,'awaiting_review',NULL),(10,26,6,'pending','2026-08-31 03:23:47','w','r','/uploads/slip_1788146627001.jpeg',NULL,NULL,'awaiting_review',NULL),(11,18,5,'pending','2026-08-31 09:42:42','w','ຳ','/uploads/slip_1788169362878.jpeg',NULL,NULL,'awaiting_review',NULL),(12,17,1,'pending','2026-09-01 02:26:34','w','d','/uploads/slip_1788229592147.jpeg',NULL,NULL,'awaiting_review',NULL),(13,26,1,'pending','2026-09-01 07:25:35','w','a','/uploads/slip_1788247534306.jpeg',NULL,NULL,'awaiting_review',NULL),(14,17,1,'pending','2026-09-01 07:29:14','95007069','ອະນຸສິດ/ສາຂາດົງໂດກ/ໄຊທານີ/ນະຄອນຫລວງ','/uploads/slip_1788247753330.jpeg',NULL,NULL,'awaiting_review',NULL),(15,17,1,'pending','2026-09-01 08:18:27','95007069','ອ','/uploads/slip_1788250705657.jpeg',NULL,NULL,'awaiting_review',NULL),(16,17,1,'pending','2026-09-01 08:24:44','w','s','/uploads/slip_1788251083298.jpeg',NULL,NULL,'awaiting_review',NULL),(17,17,1,'pending','2026-09-01 08:25:17','02012345678','d','/uploads/slip_1788251115817.jpeg',NULL,NULL,'awaiting_review',NULL),(18,17,1,'pending','2026-09-01 09:34:11','95007069','ຫຫ','/uploads/slip_1788255250089.jpeg',NULL,NULL,'awaiting_review',NULL),(19,26,1,'completed','2026-09-02 07:02:50','95007069','d','/uploads/slip_1788332566903.jpeg',NULL,'202609024019673','awaiting_review',NULL),(20,26,1,'pending','2026-09-02 07:11:12','95007069','a','/uploads/slip_1788333069331.jpeg',NULL,'202609024869204','awaiting_review',NULL),(21,17,1,'pending','2026-09-02 07:30:18','95007069','q','/uploads/slip_1788334216753.jpeg',NULL,NULL,'awaiting_review',NULL),(22,18,1,'pending','2026-09-02 07:31:51','95007069','l\r\n','/uploads/slip_1788334309180.jpeg',NULL,NULL,'awaiting_review',NULL),(23,17,1,'completed','2026-09-03 01:38:14','95007069','s','/uploads/slip_1788399491670.jpeg',NULL,NULL,'shipped',NULL),(24,17,1,'completed','2026-09-03 08:39:46','95007069','w','/uploads/slip_1788424784173.jpeg',NULL,NULL,'cancelled',NULL),(25,17,1,'completed','2026-09-04 01:25:53','95007069','a','/uploads/slip_1788485149225.jpeg',2,NULL,'cancelled',NULL),(26,17,1,'completed','2026-09-04 02:39:39','95007069','w','/uploads/slip_1788489576988.jpeg',5,NULL,'cancelled',NULL),(27,17,1,'pending','2026-09-14 03:03:31','2095007069','dd','/uploads/slip_1789355008838.jpeg',2,NULL,'awaiting_review',NULL),(28,17,1,'pending','2026-09-18 03:25:18','95007069','jj','/uploads/slip_1789701915814.jpeg',5,NULL,'awaiting_review',NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;

--
-- Dumping data for table `products`
--

/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (17,'POLO',459000.00,'L\\XL','ກົມ',3,'/uploads/1787802359948.jpeg'),(18,'POLO',359000.00,'M\\L\\XL','ຂາວ',2,'/uploads/1787802419550.jpeg'),(21,'POLO',459000.00,'L\\XL','ກົມ',5,'/uploads/1787802611404.jpeg'),(23,'POLO',289000.00,'L\\XL','ກົມ',11,'/uploads/1787802731477.jpeg'),(24,'Hoodie POLO',359000.00,'M\\L','ກົມ',21,'/uploads/1787817960398.jpeg'),(25,'Hoodie POLO',359000.00,'L\\XL','ຟ້າ',15,'/uploads/1787818011261.jpeg'),(26,'CAP POLO',99000.00,'FREESIZE','ກົມ',17,'/uploads/1787818092783.jpeg'),(27,'CAP POLO',99000.00,'FREESIZE','ແດງ',21,'/uploads/1787818143808.jpeg'),(28,'CAP POLO',99000.00,'FREESIZE','ຟ້າ',11,'/uploads/1787818186777.jpeg'),(29,'ໂສ້ງຂາສັ້ນ POLO',159000.00,'M\\L','ກົມ',23,'/uploads/1787818260861.jpeg'),(30,'ໂສ້ງຂາສັ້ນ POLO',159000.00,'M\\L','ເທົາ',17,'/uploads/1787818311876.jpeg'),(31,'Sweater POLO',289000.00,'L','ດຳ',21,'/uploads/1787818489742.jpeg');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;

--
-- Dumping data for table `settings`
--

/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('payment_qr','/uploads/qr_1788146512930.jpeg');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-21  7:19:00
