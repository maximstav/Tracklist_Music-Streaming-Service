<h1 align="center">Tracklist - Backend API</h1>

<p align="center">
  <strong>A production-ready, highly scalable REST API for a music streaming platform built with Spring Boot, MySQL, and AWS S3.</strong>
</p>

## 📖 Project Overview

This repository contains the backend service for **Tracklist**, a full-stack music streaming platform. It exposes a robust REST API that handles user authentication, media metadata management, unified catalog search, and secure media streaming via AWS S3 presigned URLs.

The architecture is designed to emphasize **scalability, security, and maintainability**, serving as a showcase of modern Java backend engineering and enterprise design patterns.

> 💡 *Note: For the full frontend repository, please refer to the root project page.*

---

## ✨ Key Features & Technical Highlights

- **Robust Security & Authentication:**
  - Stateless authentication using **JWT (JSON Web Tokens)**.
  - Role-based access control (RBAC) supporting `USER`, `ARTIST`, and `ADMIN` roles.
  - Passwords hashed securely using **BCrypt**.
- **Secure Media Delivery (AWS S3):**
  - Implements **Presigned URLs** for direct client-to-S3 media uploads/downloads. This bypasses the backend for heavy lifting, drastically reducing server load and bandwidth costs.
  - Backend verifies S3 object existence before finalizing database records (eventual consistency handling).
- **Advanced Data Relationships:**
  - Complex entity mappings including `@OneToMany` and `@ManyToMany` (e.g., Users ↔ Playlists, Songs ↔ Artists, Songs ↔ Playlists).
  - Efficiently queries combined metadata across multiple boundaries (Albums, Artists, Songs).
- **Unified Search API:**
  - Unified search endpoint that dynamically queries by Song Title, Artist Name, or Album Title without heavy N+1 query issues.
- **Standardized Error Handling:**
  - Implements **RFC 7807 Problem Details** for standardized, readable API error responses.
  - Centralized global exception handling using `@RestControllerAdvice`.

---

## 🛠️ Tech Stack

- **Platform:** Java 21
- **Framework:** Spring Boot 3.5.6 (Web, Data JPA, Security)
- **Database:** MySQL 8.0
- **Cloud/Storage:** AWS S3 (via AWS SDK 2.x)
- **Security:** Spring Security, JJWT (io.jsonwebtoken)
- **Utilities:** Lombok (reduce boilerplate), Maven

---

## 🏗️ Architecture & Design

The application follows a strict **Controller-Service-Repository** layered architecture:

1. **Controller Layer (`/controller`)**: Handles incoming HTTP requests, input validation, and maps requests to business logic.
2. **Service Layer (`/service`)**: Contains core business logic, transactional boundaries (`@Transactional`), and interacts with both repositories and external services (like S3 token generation).
3. **Repository Layer (`/repository`)**: Interfaces extending Spring Data JPA `JpaRepository` for data access. Uses derived query methods and custom JPQL where necessary.
4. **Model/Entity Layer (`/model`)**: Defines JPA Entities representing the relational database schema.
5. **DTOs (`/dto`)**: Data Transfer Objects isolate the internal domain models from the external API contract, preventing sensitive data exposure and over-fetching.

### Database Schema Modeling

- **User**: Represents platform users. Has a one-to-many relationship with `Playlist`.
- **Song**: The core media entity. Has a many-to-one relationship with `Album`, a many-to-many with `Artist` (via a join table `song_artists`), and many-to-many with `Playlist`.
- **Album**: A collection of songs, owned by an `Artist`.
- **Artist**: Represents musical acts. Associated with multiple `Songs` and `Albums`.
- **Playlist**: User-curated collections of `Songs`.

---

## 🚀 API Endpoint Summary

The API is fully documented. Below is a high-level summary of the exposed resources.

For full schemas, request/response bodies, and token handling, please see the complete [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### 🔐 Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Authenticate & receive JWT

### 🎵 Songs
- `GET /api/v1/songs` - Retrieve all songs
- `GET /api/v1/songs/{id}` - Retrieve specific song metadata
- `GET /api/v1/songs/search` - Unified search across title, artist, or album
- `GET /api/v1/songs/{id}/play` - Generate an expiring AWS S3 temporary URL for audio streaming
- `POST /api/v1/songs` - Create basic song metadata
- `POST /api/v1/songs/finalize` - Finalize song creation post-S3 upload
- `PUT /api/v1/songs/{id}` - Update song metadata
- `DELETE /api/v1/songs/{id}` - Delete a song

### 💿 Albums
- `GET /api/v1/albums` - Retrieve albums
- `GET /api/v1/albums/{id}/cover` - Get presigned S3 URL for album cover image
- `POST /api/v1/albums/finalize` - Create and finalize album post-S3 cover upload

### 🎤 Artists & 📋 Playlists
- Full CRUD operations available at `/api/v1/artists` and `/api/v1/playlists`.

---

## ⚙️ Setup and Installation

### Prerequisites
- **Java 21** or higher
- **Maven**
- **MySQL 8.0**
- An **AWS Account** with an S3 bucket configured for CORS.

### 1. Database Configuration
Create a local MySQL database named `musicapp`:
```sql
CREATE DATABASE musicapp;
CREATE USER 'musicappuser'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON musicapp.* TO 'musicappuser'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Environment Variables
You must set the following environment variables before running the application:

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | A secure, long base64 string used to sign tokens. | `your_super_secret_jwt_key_here...`|
| `AWS_ACCESS_KEY_ID` | Your AWS IAM Access Key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your AWS IAM Secret | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

Ensure your `application.properties` (or `application.yml`) is updated with your specific AWS S3 Bucket Name and Region:
```properties
aws.s3.bucket=your-bucket-name
aws.s3.region=your-region
```

### 3. Running Locally
Clone the repository, navigate into the directory, and run via Maven:

```bash
mvn clean install
mvn spring-boot:run
```

The server will start on `http://localhost:8080`.

*(Database tables will be created/updated automatically using Hibernate `ddl-auto=update` during development).*

---

## 🧪 Testing

The application relies on JUnit 5 and Spring Boot Test for unit and integration testing.

To run the test suite:
```bash
mvn test
```

*Placeholders for Test Coverage Badges / CI Pipeline statuses can be added here.*

---

*This project is built to demonstrate professional backend engineering practices. For business inquiries, networking, or questions about the architecture, feel free to reach out via GitHub or LinkedIn.*
