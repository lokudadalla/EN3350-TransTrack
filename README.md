# EN3350-TransTrack

EN3350-TransTrack is the **phase 1** deliverable of a course project that tracks power-transformer assets. The goal of this phase is to provide a foundation that lets users register transformers, record inspection sessions, and upload associated thermal images for later analysis.

## Repository Structure

- **transtrack_backend_EN3350/** – Spring Boot backend (Java 21 + Maven) exposing a REST API and serving uploaded images.
    - `src/main/java/com/entc/controller/` – API controllers for transformers, inspections and image handling.
    - `src/main/resources/` – configuration such as application properties.
- **frontend/** – React + TypeScript single-page application built with Vite.
    - `src/` – UI components and routing logic.
    - `public/` – static assets served by the client.
- **LICENSE**, **README.md** – project documentation.

## Tech Stack

### Backend
- Java 21, Spring Boot 3.5
- Spring Data JPA, validation
- springdoc OpenAPI for API docs
- ModelMapper, dotenv, Lombok
- MySQL driver (runtime)

### Frontend
- React 19 + TypeScript
- Vite build tool
- Axios, React Router
- ESLint for linting

## Core Functionality

- Create, update, list and delete transformer records
- Log inspection entries and query by transformer number
- Upload, list and remove thermal images for an inspection
- Retrieve stored image files

## API Endpoints

| Method & Path | Description |
|---------------|-------------|
| `POST /transformers` | Create a transformer |
| `GET /transformers` | List all transformers |
| `GET /transformers/{id}` | Fetch transformer by ID |
| `GET /transformers/by-no?no=` | Fetch transformer by number |
| `PUT /transformers/{id}` | Update transformer |
| `DELETE /transformers/{id}` | Remove transformer |
| `POST /inspections` | Create inspection record |
| `GET /inspections` | List all inspections |
| `GET /inspections/{id}` | Fetch inspection by ID |
| `GET /inspections/by-no?no=` | List inspections for a transformer |
| `PUT /inspections/{id}` | Update inspection |
| `DELETE /inspections/{id}` | Remove inspection |
| `POST /inspections/{inspectionId}/images` | Upload images for an inspection |
| `GET /inspections/{inspectionId}/images` | List images for an inspection |
| `GET /inspections/{inspectionId}/images/{imageId}/file` | Download an image file |
| `DELETE /inspections/{inspectionId}/images/{imageId}` | Delete an image |

## Getting Started

### Backend
1. Install JDK 21 and Maven.
2. Navigate to `transtrack_backend_EN3350`.
3. Configure database credentials in the environment or `application.properties`.
4. Run `./mvnw spring-boot:run` to start the API server.

### Frontend
1. Install Node.js and npm.
2. Navigate to `frontend`.
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to launch the development server.

## Tests
- Backend: `./mvnw test`
- Frontend: `npm test` *(no test script provided yet)*

## License
This project is licensed under the [Apache License 2.0](LICENSE).