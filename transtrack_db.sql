-- MySQL dump 10.13  Distrib 9.2.0, for Win64 (x86_64)
--
-- Host: localhost    Database: trans_track
-- ------------------------------------------------------
-- Server version	9.2.0

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
-- Table structure for table `inspection_images`
--

DROP TABLE IF EXISTS `inspection_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content_type` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `size` bigint NOT NULL,
  `storage_path` varchar(255) NOT NULL,
  `type` enum('BASELINE','MAINTENANCE') NOT NULL,
  `uploaded_at` datetime(6) NOT NULL,
  `inspection_no` bigint NOT NULL,
  `env_condition` enum('CLOUDY','RAINY','SUNNY') DEFAULT NULL,
  `uploaded_by` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKb4a8psp53w9u3li9deiyh8e9m` (`inspection_no`),
  CONSTRAINT `FKb4a8psp53w9u3li9deiyh8e9m` FOREIGN KEY (`inspection_no`) REFERENCES `inspections` (`inspection_no`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspection_images`
--

LOCK TABLES `inspection_images` WRITE;
/*!40000 ALTER TABLE `inspection_images` DISABLE KEYS */;
INSERT INTO `inspection_images` VALUES (16,'image/png','Screenshot 2025-08-27 185432.png',709675,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\2\\MAINTENANCE\\8e3a7dbc-89bb-485e-9262-1e922c409110-Screenshot_2025-08-27_185432.png','MAINTENANCE','2025-08-27 20:52:47.615879',2,NULL,'web'),(20,'image/png','Screenshot 2025-08-27 185432.png',709675,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\2\\MAINTENANCE\\5e3eabc6-b66a-4233-90ee-b674eedd3cfa-Screenshot_2025-08-27_185432.png','MAINTENANCE','2025-08-27 21:16:57.646576',2,NULL,'web'),(21,'image/png','Screenshot 2025-08-27 185416.png',190034,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\8\\BASELINE\\453b1cc0-0065-4ee6-b03b-86fd58e5022e-Screenshot_2025-08-27_185416.png','BASELINE','2025-08-27 22:48:51.171699',8,'SUNNY','web'),(22,'image/png','Screenshot 2025-08-27 185416.png',190034,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\8\\MAINTENANCE\\734727ac-82cb-4188-931a-4f9f63c5e590-Screenshot_2025-08-27_185416.png','MAINTENANCE','2025-08-27 22:49:05.095622',8,NULL,'web'),(23,'image/png','Screenshot 2025-08-27 185432.png',709675,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\7\\MAINTENANCE\\64839e06-3291-40ca-a214-5e82b9a9724a-Screenshot_2025-08-27_185432.png','MAINTENANCE','2025-08-27 22:56:27.599347',7,NULL,'web'),(30,'image/webp','OIP (1).webp',26566,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\12\\BASELINE\\c20c0022-473f-4a9b-b6ad-7ccff3c882eb-OIP__1_.webp','BASELINE','2025-08-27 23:17:47.687817',12,'SUNNY','web'),(31,'image/webp','OIP (1).webp',26566,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\6\\BASELINE\\89be5ab6-9e04-4219-bfe7-8c67f1b7d557-OIP__1_.webp','BASELINE','2025-08-27 23:21:51.922038',6,'SUNNY','web'),(32,'image/webp','OIP.webp',14562,'C:\\Users\\lokud\\Desktop\\academic works\\7th sem\\software design project\\EN3350-TransTrack\\transtrack_backend_EN3350\\uploads\\inspections\\11\\MAINTENANCE\\6fd8db1a-ee66-4c92-923c-f465f9cdf248-OIP.webp','MAINTENANCE','2025-08-27 23:22:14.788947',11,NULL,'web');
/*!40000 ALTER TABLE `inspection_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspections`
--

DROP TABLE IF EXISTS `inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspections` (
  `inspection_no` bigint NOT NULL AUTO_INCREMENT,
  `branch` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `inspection_date` date DEFAULT NULL,
  `inspection_time` time(6) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `transformer_no` varchar(255) DEFAULT NULL,
  `maintenance_date` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`inspection_no`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspections`
--

LOCK TABLES `inspections` WRITE;
/*!40000 ALTER TABLE `inspections` DISABLE KEYS */;
INSERT INTO `inspections` VALUES (2,'Trincomalee','2025-08-23 19:13:33.121964','2025-05-21','07:00:00.000000','Pending','TX-1001','2025-08-28'),(3,'Trincomalee','2025-08-23 19:21:19.570849','2025-05-21','08:00:00.000000','Pending','Tx-1006',NULL),(5,'vavuniya','2025-08-23 20:55:50.941694','2024-05-21','07:00:00.000000','Pending','Tx-1006',NULL),(6,'Wattala','2025-08-27 22:47:35.067737','2025-08-27','07:00:00.000000','Completed','TX-1001','2025-08-14'),(7,'Nugegoda','2025-08-27 22:48:18.577234','2025-08-27','07:00:00.000000','In Progress','TX-1001','2025-08-27'),(8,'Kottawa','2025-08-27 22:48:35.585279','2025-08-27','07:00:00.000000','Pending','TX-1008','-'),(9,'Nugegoda','2025-08-27 22:49:18.791688','2025-08-27','07:00:00.000000','Pending','TX-1008','-'),(10,'Kiribathgoda','2025-08-27 23:02:42.405089','2025-08-27','07:00:00.000000','Pending','TX-1005','-'),(11,'Nugegoda','2025-08-27 23:07:19.424782','2025-08-27','07:00:00.000000','Pending','TX-1001','-'),(12,'Nugegoda','2025-08-27 23:17:39.330230','2025-08-27','07:00:00.000000','Pending','TX-1009','-');
/*!40000 ALTER TABLE `inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transformers`
--

DROP TABLE IF EXISTS `transformers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transformers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `transformer_no` varchar(255) DEFAULT NULL,
  `pole_no` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `location_details` varchar(255) DEFAULT NULL,
  `favorite` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transformer_no` (`transformer_no`),
  KEY `idx_transformers_region` (`region`),
  KEY `idx_transformers_type` (`type`),
  KEY `idx_transformers_no` (`transformer_no`),
  KEY `idx_transformers_pole_no` (`pole_no`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transformers`
--

LOCK TABLES `transformers` WRITE;
/*!40000 ALTER TABLE `transformers` DISABLE KEYS */;
INSERT INTO `transformers` VALUES (1,'TX-1001','P-45','Gampaha','Distribution','Near Main Street',1,'2025-08-15 12:25:46.000000'),(4,'TX-1005','P-47','Mawaramandiya','Bulk','Mawaramandiya junction',1,'2025-08-12 12:30:00.000000'),(7,'Tx-1006','P-41','Trincomalee','Bulk','near pigeon island',1,'2025-08-23 13:36:19.125369'),(8,'TX-1008','P-60','Gampaha','Distribution','near keells',0,'2025-08-27 17:16:39.279628'),(9,'TX-1009','P-64','Avissawella','Bulk','Near university',0,'2025-08-27 17:46:22.035143');
/*!40000 ALTER TABLE `transformers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-27 23:51:52
