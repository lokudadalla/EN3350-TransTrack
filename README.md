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

## 1. Overview

**EN3350-TransTrack** digitizes the entire workflow of transformer thermal inspections:

- Managing transformer assets  
- Uploading baseline and maintenance thermal images  
- Running AI-based anomaly detection  
- Allowing engineers to validate, correct, or add annotations  
- Generating complete digital maintenance records with embedded anomalies  

The system implements **all Functional Requirements (FR1.1–FR4.3)** from the official EN3350 multi-phase project outline.

---

## 2. Features Summary (FR1–FR4 Fully Completed)

### **Phase 1 – Transformer & Baseline Image Management**

#### ✔ FR1.1 Transformer Management
- Add, view, edit, delete transformer records  
- Store ID, location, capacity, and metadata  
- Structured admin dashboard

#### ✔ FR1.2 Thermal Image Upload + Tagging
- Upload **Baseline** and **Maintenance** images  
- Associate images with transformers and inspection sessions  
- Store metadata: date, uploader, type, transformer, inspection ID

#### ✔ FR1.3 Environmental Categorization
- Baseline uploads include **Sunny / Cloudy / Rainy** tagging  
- Weather metadata saved and queryable

---

### **Phase 2 – Automated Anomaly Detection**

#### ✔ FR2.1 AI Comparison Engine
- FastAPI YOLOv5 model  
- Compares maintenance vs. baseline images  
- Detects thermal anomalies:
  - Hotspots  
  - Temperature deviations  
  - Asymmetries  

#### ✔ FR2.2 Side-by-Side Comparison UI
- Baseline and maintenance images shown side-by-side
- Zoom, pan, and reset tools
- Overlays of detected anomalies

#### ✔ FR2.3 Automatic Anomaly Marking
- Bounding boxes and severity metadata
- Confidence scores
- Stored in DB for Phase 3 interaction

---

### **Phase 3 – Interactive Annotation & Feedback**

#### ✔ FR3.1 Annotation Tools
- Engineers can:
  - Drag/resize predicted boxes
  - Delete wrong detections
  - Add new anomalies (box or polygon)
- Supports comments + notes

#### ✔ FR3.2 Persistence of Annotations
- Every annotation (added/edited/deleted) saved automatically  
- Metadata:
  - User ID  
  - Timestamp  
  - Annotation type  
  - Geometry  
- Reloads instantly when image is opened again

#### ✔ FR3.3 Feedback Loop for Model Improvement
- Exportable JSON/CSV log including:
  - Original AI detections
  - Final human annotations  
  - Transformer ID, image ID, timestamps, user actions  
- Ready for fine-tuning or dataset updates

---

### **Phase 4 – Maintenance Record Sheet Generation**

#### ✔ FR4.1 Maintenance Record Form
For each processed inspection, system auto-generates a digital maintenance form including:

- Transformer metadata  
- Inspection timestamp  
- Embedded thermal image  
- Anomaly markers (from Phase 3)  
- Full anomaly list with descriptions, severity, and notes  

#### ✔ FR4.2 Engineer Editable Fields
Engineers can fill:

- Inspector name  
- Transformer status (OK / Needs Maintenance / Urgent Attention)  
- Voltage, current, and other readings  
- Recommended actions  
- Additional remarks  

#### ✔ FR4.3 Record Saving + Retrieval
- Records saved to DB  
- Versioned + timestamped  
- View history of records per transformer  
- Printable/PDF-ready layout

---

## 3. System Architecture

### **High-Level Architecture**

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

---
## 4. Folder Structure

```
EN3350-TransTrack/
│
├── AI_backend/
│   ├── ai_logic/
│   │   ├── cfg/
│   │   ├── best.pt
│   │   ├── best2.pt
│   │   ├── finetune.py
│   │   └── infer_thermal.py
│   ├── train/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── transtrack_backend_EN3350/
│   ├── .mvn/
│   ├── src/
│   ├── target/
│   ├── training_batches/
│   ├── uploads/
│   └── pom.xml
│
├── .gitignore
├── README.md
└── transtrack_db.sql
```
---

## 5. Prerequisites

Before setting up the project, ensure you have the following installed:

### **Required Software**
- **Java 21** - Required for Spring Boot backend
  - Verify: `java -version`
  - Download: [Oracle JDK 21](https://www.oracle.com/java/technologies/downloads/#java21) or [OpenJDK 21](https://adoptium.net/)

- **Node.js 18+** - Required for React frontend
  - Verify: `node --version`
  - Download: [Node.js](https://nodejs.org/)

- **Python 3.10+** - Required for AI backend
  - Verify: `python --version` or `python3 --version`
  - Download: [Python](https://www.python.org/downloads/)

- **MySQL 8.0+** - Database server
  - Verify: `mysql --version`
  - Download: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

- **Maven** - For building Spring Boot (usually bundled with IDE)
  - Verify: `mvn --version`
  - Download: [Apache Maven](https://maven.apache.org/download.cgi)

### **Optional but Recommended**
- **Git** - For version control
- **Postman** or **cURL** - For API testing
- **VS Code** or **IntelliJ IDEA** - For development

---

## 6. Tech Stack

### **Backend — Spring Boot**
- Java 21  
- Spring Boot 3.5  
- Spring Data JPA (MySQL 8)  
- ModelMapper  
- Lombok  
- Springdoc OpenAPI  
- All APIs return **ResponseEntity**  

### **Frontend — React + TypeScript**
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

### **AI Backend — FastAPI**
- FastAPI  
- Pydantic  
- YOLOv5 inference  
- Torch + OpenCV  
- Parameterized inference pipeline  

---

## 7. API Endpoints (Summary)

### **Auth**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |

### **Transformers**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/transformers` | Create transformer |
| GET | `/transformers` | List all |
| GET | `/transformers/{id}` | Get by ID |
| GET | `/transformers/by-no?no=` | Get by transformer number |
| PUT | `/transformers/{id}` | Update |
| DELETE | `/transformers/{id}` | Delete |

### **Inspections**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/inspections` | Create inspection |
| GET | `/inspections` | List |
| GET | `/inspections/{id}` | Get |
| GET | `/inspections/by-no?no=` | Get by transformer |
| PUT | `/inspections/{id}` | Update |
| DELETE | `/inspections/{id}` | Delete |

### **Images**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/inspections/{id}/images` | Upload image |
| GET | `/inspections/{id}/images` | List images |
| GET | `/inspections/{id}/images/{imageId}/file` | Get file |
| DELETE | `/inspections/{id}/images/{imageId}` | Delete |

### **Annotations**
| Method | Endpoint | Description |
|-------|----------|-------------|
| PUT | `/inspections/{id}/images/{imageId}/anomalies` | Replace anomaly list |
| DELETE | `/inspections/{id}/images/{imageId}/anomalies/{anomId}` | Delete anomaly |

### **Maintenance Records**
| Method | Endpoint | Description |
|-------|----------|-------------|
| POST | `/records` | Create maintenance record |
| GET | `/records/{transformerNo}` | Get all records for a transformer |
| GET | `/records/view/{id}` | View a specific record |

---

## 8. Getting Started

### **Step 1: Clone the Repository**
```bash
git clone https://github.com/lokudadalla/EN3350-TransTrack.git
cd EN3350-TransTrack
```

### **Step 2: Database Setup**

1. **Start MySQL Server** (ensure MySQL is running)

2. **Create Database and Import Schema**
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE trans_track;
USE trans_track;

# Exit MySQL
exit;

# Import the schema
mysql -u root -p trans_track < transtrack_db.sql
```

3. **Verify Tables Created**
```bash
mysql -u root -p trans_track -e "SHOW TABLES;"
```

You should see: `users`, `transformers`, `inspections`, `inspection_images`, `anomalies`, `maintenance_records`

### **Step 3: Environment Configuration**

Create a `.env` file in the `transtrack_backend_EN3350` directory:

```bash
cd transtrack_backend_EN3350
```

Create `.env` file with:
```properties
# Database Configuration
SQL_PW=your_mysql_password_here

# Application URLs
APP_PUBLIC_BASE=http://localhost:8080
PY_INFER_BASE=http://localhost:8000

# Python Environment (adjust path to your Python executable)
PY_TRAIN_PYTHON=/path/to/your/python
```

**Alternative:** Edit `src/main/resources/application.properties` directly:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/trans_track
spring.datasource.username=root
spring.datasource.password=your_password_here
app.server.public-base=http://localhost:8080
py.infer.base=http://localhost:8000
```

### **Step 4: Start Backend (Spring Boot)**
```bash
cd transtrack_backend_EN3350

# Windows
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

✅ Backend runs at: **http://localhost:8080**  
📄 API Docs: **http://localhost:8080/swagger-ui.html**

### **Step 5: Start Frontend (React)**

Open a **new terminal**:
```bash
cd frontend
npm install
npm run dev
```

✅ Frontend runs at: **http://localhost:5173**

### **Step 6: Start AI Backend (FastAPI)**

Open a **new terminal**:
```bash
cd AI_backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

✅ AI Backend runs at: **http://localhost:8000**  
📄 API Docs: **http://localhost:8000/docs**

### **Step 7: Verify System Integration**

1. Open browser: **http://localhost:5173**
2. Register a new user
3. Create a transformer
4. Create an inspection
5. Upload baseline and maintenance images
6. Check that AI anomaly detection runs automatically

**All three services must be running simultaneously!**

---

## 9. System Integration Flow

### **Complete Request Lifecycle**

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. User uploads MAINTENANCE image           │
│                        via React Frontend                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. POST /inspections/{id}/images?type=MAINTENANCE              │
│     → Spring Boot receives multipart file                       │
│     → Saves to disk: uploads/inspections/{id}/maintenance/      │
│     → Creates InspectionImage entity in MySQL                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Spring Boot triggers AI inference                           │
│     → Finds matching BASELINE image for same transformer        │
│     → Builds URLs:                                              │
│       - maintenance: http://localhost:8080/inspections/.../file │
│       - baseline: http://localhost:8080/inspections/.../file    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. POST http://localhost:8000/infer                            │
│     → FastAPI receives image URLs                               │
│     → Downloads images via HTTP GET                             │
│     → Saves to temp files                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. YOLOv5 Inference (infer_thermal.py)                         │
│     → Loads model: ai_logic/best2.pt                            │
│     → Loads config: ai_logic/cfg/config_global.json             │
│     → Runs YOLO detection on maintenance image                  │
│     → Compares with baseline (temperature analysis)             │
│     → Applies rule-based classification                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. FastAPI returns JSON                                        │
│     {                                                           │
│       "boxes": [                                                │
│         {"label": "Loose Joint - Faulty", "x": 120, ...},      │
│         {"label": "Point Overload Faulty", "x": 300, ...}      │
│       ]                                                         │
│     }                                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Spring Boot processes AI response                           │
│     → Parses JSON boxes                                         │
│     → Creates Anomaly entities                                  │
│     → Links to InspectionImage                                  │
│     → Saves to MySQL database                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. Frontend displays results                                   │
│     → Fetches image + anomalies via GET request                 │
│     → Renders side-by-side comparison                           │
│     → Overlays bounding boxes with labels                       │
│     → Engineer can edit/add/delete annotations                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. AI Inference API Details

### **Endpoint: POST `/infer`**

Performs thermal anomaly detection by comparing a maintenance image against an optional baseline.

#### **Request Body**
```json
{
  "maintenance_image_path": "http://localhost:8080/inspections/3/images/17/file",
  "baseline_image_path": "http://localhost:8080/inspections/3/images/4/file",
  "save_annot": null,
  "device": "cpu",
  "imgsz": 640,
  "half": false,
  "web_payload": true,
  "temperature_percent": 50,
  "cfg_overrides": null
}
```

#### **Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maintenance_image_path` | string | ✅ Yes | URL, file path, or DB ID of maintenance image |
| `baseline_image_path` | string | ❌ No | URL, file path, or DB ID of baseline image |
| `save_annot` | string | ❌ No | File path to save annotated preview image |
| `device` | string | ❌ No | `"cpu"` or `"0"` (GPU) - default: `"cpu"` |
| `imgsz` | int | ❌ No | Input image size - default: `640` |
| `half` | bool | ❌ No | Use FP16 half-precision - default: `false` |
| `web_payload` | bool | ❌ No | Return JSON format - default: `true` |
| `temperature_percent` | int | ❌ No | Temperature sensitivity (0-100) - default: `50` |
| `cfg_overrides` | object | ❌ No | Override config.json parameters |

#### **Response**
```json
{
  "boxes": [
    {
      "label": "Loose Joint - Faulty",
      "x": 120,
      "y": 50,
      "w": 90,
      "h": 80,
      "conf": 0.87,
      "cls": "loose_joint"
    },
    {
      "label": "Point Overload Faulty",
      "x": 300,
      "y": 0,
      "w": 250,
      "h": 200,
      "conf": 0.92,
      "cls": "point_overload"
    },
    {
      "label": "Surface Temp Rise Faulty",
      "x": 550,
      "y": 120,
      "w": 180,
      "h": 160,
      "conf": 0.78,
      "cls": "surface_temp_rise"
    }
  ]
}
```

#### **Anomaly Types Detected**
- **Loose Joint** - Connection points with abnormal heat
- **Point Overload** - Localized overheating
- **Surface Temp Rise** - Elevated surface temperatures
- **Asymmetry** - Unbalanced thermal patterns

#### **Test with cURL**
```bash
curl -X POST http://localhost:8000/infer \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance_image_path": "http://localhost:8080/inspections/3/images/17/file",
    "baseline_image_path": "http://localhost:8080/inspections/3/images/4/file",
    "temperature_percent": 60
  }'
```
---

## 11. Troubleshooting

### **Common Issues and Solutions**

#### **1. "Cannot connect to MySQL database"**
```
com.mysql.cj.jdbc.exceptions.CommunicationsException: Communications link failure
```

**Solutions:**
- ✅ Verify MySQL is running: `systemctl status mysql` (Linux) or check Windows Services
- ✅ Check credentials in `.env` or `application.properties`
- ✅ Confirm database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- ✅ Check MySQL port (default 3306): `netstat -an | grep 3306`
- ✅ Ensure MySQL allows localhost connections (check `bind-address` in `my.cnf`)

#### **2. "Port 8080 already in use"**
```
Web server failed to start. Port 8080 was already in use.
```

**Solutions:**
- ✅ Kill process using port: 
  - Windows: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`
  - Linux/Mac: `lsof -ti:8080 | xargs kill -9`
- ✅ Change port in `application.properties`: `server.port=8081`

#### **3. "Error loading ASGI app. Could not import module 'main'"**
```
ERROR: Error loading ASGI app. Could not import module "main".
```

**Solutions:**
- ✅ Run from correct directory: `cd AI_backend` then `uvicorn main:app --reload --port 8000`
- ✅ Don't use `--app-dir ai_logic` flag
- ✅ Verify `main.py` exists in current directory

#### **4. "YOLO weights not found on server"**
```
HTTPException: YOLO weights not found on server
```

**Solutions:**
- ✅ Verify `AI_backend/ai_logic/best2.pt` exists
- ✅ Check file permissions: `ls -l AI_backend/ai_logic/*.pt`
- ✅ Ensure Git LFS tracked the model file (if using Git LFS)
- ✅ Download model weights if missing from training artifacts

#### **5. CORS Error in Browser Console**
```
Access to fetch at 'http://localhost:8080/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solutions:**
- ✅ Add CORS configuration in Spring Boot:
```java
@CrossOrigin(origins = "http://localhost:5173")
```
- ✅ Or configure globally in `WebConfig.java`

#### **6. "Failed to fetch" when uploading images**
```
Failed to fetch image from Spring Boot
```

**Solutions:**
- ✅ Ensure Spring Boot is running on port 8080
- ✅ Check `application.properties`: `app.server.public-base=http://localhost:8080`
- ✅ Verify image URL is accessible: `curl http://localhost:8080/inspections/3/images/4/file`
- ✅ Check `uploads/` directory permissions

#### **7. AI Backend Returns Empty Boxes**
```json
{"boxes": []}
```

**Solutions:**
- ✅ Lower `temperature_percent` (try 30-40 instead of 50)
- ✅ Check if baseline image is provided and valid
- ✅ Verify images are thermal images (not regular RGB)
- ✅ Check model confidence threshold in `config_global.json`

#### **8. "ModuleNotFoundError: No module named 'ultralytics'"**
```
ModuleNotFoundError: No module named 'ultralytics'
```

**Solutions:**
- ✅ Activate virtual environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux/Mac)
- ✅ Install requirements: `pip install -r requirements.txt`
- ✅ Verify installation: `pip list | grep ultralytics`

#### **9. Frontend shows "Network Error"**

**Solutions:**
- ✅ Check all three services are running:
  - Spring Boot: http://localhost:8080
  - React: http://localhost:5173
  - FastAPI: http://localhost:8000
- ✅ Check browser console for specific error
- ✅ Verify API base URL in `frontend/src/api/http.ts`

#### **10. Maven build fails**
```
Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin
```

**Solutions:**
- ✅ Verify Java version: `java -version` (must be Java 21)
- ✅ Set JAVA_HOME: 
  - Windows: `set JAVA_HOME=C:\Program Files\Java\jdk-21`
  - Linux/Mac: `export JAVA_HOME=/usr/lib/jvm/java-21`
- ✅ Clean and rebuild: `./mvnw clean install`

### **Enable Debug Logging**

If issues persist, enable debug logging:

**Spring Boot** (`application.properties`):
```properties
logging.level.root=DEBUG
logging.level.org.springframework.web=DEBUG
```

**FastAPI** (add to `main.py`):
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### **Still Having Issues?**

1. Check service logs for specific error messages
2. Verify all prerequisites are installed (Java 21, Node 18+, Python 3.10+, MySQL 8)
3. Ensure database schema is imported correctly
4. Test each service independently before integration
5. Review firewall/antivirus settings blocking ports

---

## 12 License

This project is released under the Apache License 2.0.

## 13. Team

Team 404
University of Moratuwa
2021 Batch
