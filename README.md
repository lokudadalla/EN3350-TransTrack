# EN3350-TransTrack

**EN3350-TransTrack** is the **Phase 1/2/3 deliverable** of a course project developed under the *EN3350 Software Engineering* module.  
The system provides a comprehensive platform to manage **power transformer assets**, record **inspection sessions**, and upload **thermal images** for anomaly detection through an integrated **AI backend**.

---

## 🚀 Project Overview

The goal of this phase is to implement the foundational architecture that enables:

- Transformer registration and inspection tracking  
- Secure user authentication  
- Thermal image upload and retrieval  
- Integration with an external AI inference backend for anomaly detection  

Future phases will focus on **interactive anomaly feedback**, **model retraining integration**, and **user analytics dashboards**.

---

## 🧱 Repository Structure
```
EN3350-TransTrack/
│
├── transtrack_backend_EN3350/        # Spring Boot backend
│   ├── src/main/java/com/entc/controller/  # REST controllers
│   ├── src/main/java/com/entc/service/     # Business logic services
│   ├── src/main/java/com/entc/repo/        # JPA repositories
│   ├── src/main/java/com/entc/model/       # Entity models
│   ├── src/main/resources/                 # Configuration files
│   └── pom.xml                             # Maven dependencies
│
├── frontend/                          # React + TypeScript frontend (Vite)
│   ├── src/                          # Components, routes, API services
│   ├── public/                       # Static assets
│   └── package.json                  # Node dependencies
│
├── AI_backend/                        # FastAPI-based AI inference service
│   ├── ai_logic/                     # YOLO inference and configuration files
│   ├── best2.pt                      # YOLOv5 trained weights
│   └── main.py                       # FastAPI entry point
│
├── LICENSE
└── README.md
```

---

## 🧰 Tech Stack

### **Backend (Java Spring Boot)**
- Java 21 + Spring Boot 3.5
- Spring Data JPA (MySQL)
- Validation + Lombok + dotenv
- Springdoc OpenAPI for documentation
- ModelMapper for DTO conversions
- RESTful architecture with `ResponseEntity` handling

### **Frontend (React + TypeScript)**
- React 19 with Vite build tool
- TypeScript + Axios + React Router
- ESLint for linting and code quality
- Simple UI for CRUD operations and image uploads

### **AI Backend (Python FastAPI)**
- FastAPI + Pydantic
- YOLOv5-based model (`best2.pt`)
- Thermal image anomaly detection
- Integrated configuration overrides via JSON
- Image fetching from Spring backend via REST
- OpenCV + Torch inference pipeline (`infer_thermal`)

---

## ⚙️ Core Functionality

### 1. **User Authentication**
- Simple `/auth/register` and `/auth/login` endpoints  
- Plain-text password storage (for prototype phase only)  
- Uses `UserRepository` for persistence  

### 2. **Transformer Management**
- Register, update, and delete transformer details
- Fetch by ID or transformer number
- Optional "favorite" field for user marking

### 3. **Inspection Management**
- Record and query inspection sessions
- Link inspections to transformers and users
- Retrieve inspections by transformer number

### 4. **Image Upload and Retrieval**
- Upload images under an inspection (`BASELINE` or `MAINTENANCE`)
- Retrieve stored files for display or inference
- Delete or update anomalies linked to an image

### 5. **AI Inference Integration**
- When a MAINTENANCE image is uploaded, it is automatically sent to the AI backend
- The backend performs YOLO-based thermal anomaly detection
- The output JSON (`{"boxes":[...]}`) is returned and stored in the database

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Description |
|--------|-----------|-------------|
| **Auth** |  |  |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login with credentials |
| **Transformers** |  |  |
| `POST` | `/transformers` | Create transformer |
| `GET` | `/transformers` | List all transformers |
| `GET` | `/transformers/{id}` | Get transformer by ID |
| `GET` | `/transformers/by-no?no=` | Get transformer by number |
| `PUT` | `/transformers/{id}` | Update transformer |
| `DELETE` | `/transformers/{id}` | Delete transformer |
| **Inspections** |  |  |
| `POST` | `/inspections` | Create inspection record |
| `GET` | `/inspections` | List all inspections |
| `GET` | `/inspections/{id}` | Get inspection by ID |
| `GET` | `/inspections/by-no?no=` | List inspections by transformer number |
| `PUT` | `/inspections/{id}` | Update inspection |
| `DELETE` | `/inspections/{id}` | Delete inspection |
| **Inspection Images** |  |  |
| `POST` | `/inspections/{inspectionId}/images` | Upload inspection images |
| `GET` | `/inspections/{inspectionId}/images` | List inspection images |
| `GET` | `/inspections/{inspectionId}/images/{imageId}/file` | Download image file |
| `DELETE` | `/inspections/{inspectionId}/images/{imageId}` | Delete image |
| `PUT` | `/inspections/{inspectionId}/images/{imageId}/anomalies` | Replace anomalies |
| `DELETE` | `/inspections/{inspectionId}/images/{imageId}/anomalies/{anomalyId}` | Delete anomaly |

---

## 🧠 AI Backend API

### Endpoint: `/infer`
Performs inference between a **maintenance image** and an optional **baseline image**.

#### Request Example:
```json
{
  "maintenance_image_path": "http://localhost:8080/inspections/1/images/3/file",
  "baseline_image_path": "http://localhost:8080/inspections/1/images/2/file",
  "save_annot": "/tmp/annot.jpg",
  "temperature_percent": 50,
  "device": "cpu",
  "web_payload": true
}
```

#### Response Example:
```json
{
  "boxes": [
    { "label": "Loose Joint - Faulty", "x": 120, "y": 50, "w": 90, "h": 80 },
    { "label": "Point Overload Faulty", "x": 300, "y": 0, "w": 250, "h": 200 }
  ]
}
```

---

## 🧩 System Integration Flow

1. **Frontend** uploads an image → calls  
   `POST /inspections/{inspectionId}/images?type=MAINTENANCE`

2. **Spring Boot Backend** stores the file and triggers the AI backend

3. **FastAPI Service** fetches the file from Spring Boot using a public URL

4. **YOLOv5 model** runs inference and returns detected anomalies

5. **Spring Boot** stores and serves the annotated results

---

## 🧑‍💻 Getting Started

### Backend (Spring Boot)
```bash
# Navigate to backend folder
cd transtrack_backend_EN3350

# Run with Maven Wrapper
./mvnw spring-boot:run
```

**Configuration:**

Set database credentials in `.env` or `application.properties`

Example:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/transtrack
spring.datasource.username=root
spring.datasource.password=your_password
app.public.base=http://localhost:8080
```

### Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
Visit: http://localhost:5173

### AI Backend (FastAPI)
```bash
cd AI_backend
pip install -r requirements.txt
uvicorn ai_logic.main:app --reload --port 8000
```

**Environment variable (optional):**
```bash
export APP_PUBLIC_BASE="http://localhost:8080"
```

---

## 🧪 Testing

### Backend
```bash
cd transtrack_backend_EN3350
./mvnw test
```

### Frontend
```bash
cd frontend
npm test
```

### AI Backend
```bash
curl -X POST http://localhost:8000/infer -H "Content-Type: application/json" \
-d '{"maintenance_image_path": "http://localhost:8080/inspections/1/images/3/file"}'
```

---

## 🧾 License

This project is licensed under the Apache License 2.0.

