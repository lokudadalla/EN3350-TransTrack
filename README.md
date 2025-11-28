# EN3350-TransTrack

A complete end-to-end system for transformer thermal inspection, AI-assisted anomaly detection, interactive annotation, and digital maintenance record generation.

Developed for the **EN3350 Software Design Competition**  
Department of Electronic & Telecommunication Engineering  
University of Moratuwa

---

<p align="center">
  <img src="https://img.shields.io/badge/Backend-Spring%20Boot%203.5-brightgreen" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue" />
  <img src="https://img.shields.io/badge/AI%20Backend-FastAPI%20%2B%20YOLOv5-orange" />
  <img src="https://img.shields.io/badge/Database-MySQL%208-lightgrey" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-yellow" />
</p>

---

# 1. Overview

**EN3350-TransTrack** digitizes the entire workflow of transformer thermal inspections:

- Managing transformer assets  
- Uploading baseline and maintenance thermal images  
- Running AI-based anomaly detection  
- Allowing engineers to validate, correct, or add annotations  
- Generating complete digital maintenance records with embedded anomalies  

The system implements **all Functional Requirements (FR1.1–FR4.3)** from the official EN3350 multi-phase project outline.

---

# 2. Features Summary (FR1–FR4 Fully Completed)

## **Phase 1 – Transformer & Baseline Image Management**

### ✔ FR1.1 Transformer Management
- Add, view, edit, delete transformer records  
- Store ID, location, capacity, and metadata  
- Structured admin dashboard

### ✔ FR1.2 Thermal Image Upload + Tagging
- Upload **Baseline** and **Maintenance** images  
- Associate images with transformers and inspection sessions  
- Store metadata: date, uploader, type, transformer, inspection ID

### ✔ FR1.3 Environmental Categorization
- Baseline uploads include **Sunny / Cloudy / Rainy** tagging  
- Weather metadata saved and queryable

---

## **Phase 2 – Automated Anomaly Detection**

### ✔ FR2.1 AI Comparison Engine
- FastAPI YOLOv5 model  
- Compares maintenance vs. baseline images  
- Detects thermal anomalies:
  - Hotspots  
  - Temperature deviations  
  - Asymmetries  

### ✔ FR2.2 Side-by-Side Comparison UI
- Baseline and maintenance images shown side-by-side
- Zoom, pan, and reset tools
- Overlays of detected anomalies

### ✔ FR2.3 Automatic Anomaly Marking
- Bounding boxes and severity metadata
- Confidence scores
- Stored in DB for Phase 3 interaction

---

## **Phase 3 – Interactive Annotation & Feedback**

### ✔ FR3.1 Annotation Tools
- Engineers can:
  - Drag/resize predicted boxes
  - Delete wrong detections
  - Add new anomalies (box or polygon)
- Supports comments + notes

### ✔ FR3.2 Persistence of Annotations
- Every annotation (added/edited/deleted) saved automatically  
- Metadata:
  - User ID  
  - Timestamp  
  - Annotation type  
  - Geometry  
- Reloads instantly when image is opened again

### ✔ FR3.3 Feedback Loop for Model Improvement
- Exportable JSON/CSV log including:
  - Original AI detections
  - Final human annotations  
  - Transformer ID, image ID, timestamps, user actions  
- Ready for fine-tuning or dataset updates

---

## **Phase 4 – Maintenance Record Sheet Generation**

### ✔ FR4.1 Maintenance Record Form
For each processed inspection, system auto-generates a digital maintenance form including:

- Transformer metadata  
- Inspection timestamp  
- Embedded thermal image  
- Anomaly markers (from Phase 3)  
- Full anomaly list with descriptions, severity, and notes  

### ✔ FR4.2 Engineer Editable Fields
Engineers can fill:

- Inspector name  
- Transformer status (OK / Needs Maintenance / Urgent Attention)  
- Voltage, current, and other readings  
- Recommended actions  
- Additional remarks  

### ✔ FR4.3 Record Saving + Retrieval
- Records saved to DB  
- Versioned + timestamped  
- View history of records per transformer  
- Printable/PDF-ready layout

---

# 3. System Architecture

## **High-Level Architecture**

               +------------------------------+
               |          Frontend            |
               |     React + TypeScript       |
               +---------------+--------------+
                               |
                               |  REST
                               v
                  +------------+-------------+
                  |       Spring Boot        |
                  |  Transformer + Image API |
                  +------------+-------------+
                               |
             +-----------------+------------------+
             |                                    |
             | JPA / MySQL DB                     | REST to AI Backend
             v                                    v
      +------+--------+                 +----------+---------+
      |   MySQL 8     |                 |   FastAPI + YOLOv5 |
      |  Data Store   |                 |  Inference Engine  |
      +---------------+                 +---------------------+

---

# 4. Folder Structure

EN3350-TransTrack/
│
├── AI_backend/
│   ├── ai_logic/
│   ├── train/
│   └── main.py
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│
├── transtrack_backend_EN3350/
│   ├── .mvn/
│   ├── ai_logic/
│   ├── src/
│   ├── target/
│   ├── training_batches/
│   ├── uploads/
│ 
├── README.md
│ 
└── transtrack_db.sql
---

# 5. Tech Stack

## **Backend — Spring Boot**
- Java 21  
- Spring Boot 3.5  
- Spring Data JPA (MySQL 8)  
- ModelMapper  
- Lombok  
- Springdoc OpenAPI  
- All APIs return **ResponseEntity**  

## **Frontend — React + TypeScript**
- React 19  
- Vite  
- Axios  
- React Router  
- Custom UI for:
  - Transformer CRUD  
  - Inspections  
  - Image upload  
  - Annotation tools  
  - Maintenance forms  

## **AI Backend — FastAPI**
- FastAPI  
- Pydantic  
- YOLOv5 inference  
- Torch + OpenCV  
- Parameterized inference pipeline  

---

# 6. API Endpoints (Summary)

## **Auth**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |

## **Transformers**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/transformers` | Create transformer |
| GET | `/transformers` | List all |
| GET | `/transformers/{id}` | Get by ID |
| GET | `/transformers/by-no?no=` | Get by transformer number |
| PUT | `/transformers/{id}` | Update |
| DELETE | `/transformers/{id}` | Delete |

## **Inspections**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/inspections` | Create inspection |
| GET | `/inspections` | List |
| GET | `/inspections/{id}` | Get |
| GET | `/inspections/by-no?no=` | Get by transformer |
| PUT | `/inspections/{id}` | Update |
| DELETE | `/inspections/{id}` | Delete |

## **Images**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/inspections/{id}/images` | Upload image |
| GET | `/inspections/{id}/images` | List images |
| GET | `/inspections/{id}/images/{imageId}/file` | Get file |
| DELETE | `/inspections/{id}/images/{imageId}` | Delete |

## **Annotations**
| Method | Endpoint | Description |
|-------|----------|-------------|
| PUT | `/inspections/{id}/images/{imageId}/anomalies` | Replace anomaly list |
| DELETE | `/inspections/{id}/images/{imageId}/anomalies/{anomId}` | Delete anomaly |

## **Maintenance Records**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/records` | Create maintenance record |
| GET | `/records/{transformerNo}` | Get all records for a transformer |
| GET | `/records/view/{id}` | View a specific record |

---

# 7. Getting Started

## **Backend**
```bash
cd transtrack_backend_EN3350
./mvnw spring-boot:run
```
### Set DB credentials in:

application.properties