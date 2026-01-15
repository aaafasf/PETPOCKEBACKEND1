# PetPocket Backend - AI Agent Instructions

## Architecture Overview

**PetPocket** is an Express.js-based pet services platform with a **dual-database architecture**:
- **MySQL (Sequelize ORM)** - Primary relational database for business logic (users, appointments, products, payments)
- **MongoDB (Mongoose)** - Secondary database for supplementary data (likely analytics, logs, or historical records)

The codebase follows **layered architecture**:
```
root/                     # Express app setup & server entry
src/
  ├─ application/         # Business logic, controllers, validation
  ├─ domain/models/       # Data model definitions (SQL & Mongo)
  ├─ infrastructure/      # Database connections, HTTP routes, controllers
  └─ config/              # Environment & connection credentials
```

## Critical Workflows

### Development
- `npm run dev` - Starts nodemon with auto-reload on file changes (watches `root/index.js`)
- `npm start` - Production entry point (node `root/index.js`)
- No test suite configured (`"test": "echo error"`)

### Docker Deployment
- Uses **Node 20-slim** image
- **Critical**: Clears `node_modules` twice to prevent Windows/Linux binary conflicts
- Environment: `NODE_ENV=production`, `PORT=3000`

### Database Initialization
- MySQL/Sequelize initialized in `src/infrastructure/Database/dataBase.orm.js`
- Must be imported in `root/index.js` before app starts (already done)
- Connection pooling: max=20, min=5, acquire timeout=30s, idle timeout=10s

## Project-Specific Patterns

### 1. Data Encryption (Security-First)
User sensitive fields are **encrypted at application level** using `encrypt()`/`decrypt()` from `src/application/controller/encrypDates.js`:
- `nameUsers`, `phoneUser`, `emailUser`, `userName` are encrypted before storage
- Controllers decrypt on retrieval before sending to frontend
- **Pattern**: Always decrypt when reading, encrypt before saving
- Example:
  ```javascript
  const user = await orm.usuario.findOne({where: {userName: encrypt(userName)}});
  const decryptedEmail = decrypt(user.emailUser);
  ```

### 2. Dual ORM Access Pattern
Controllers access both databases:
- `orm.modelo` - Sequelize (MySQL) - primary business data
- `sql.promise().query()` - Raw MySQL queries (for complex operations)
- `mongo.model` - Mongoose models (secondary data)

Don't mix ORMs in same function; choose primary data source and stick with it.

### 3. Controller Structure (`src/infrastructure/http/controller/`)
Each controller (e.g., `usuario.controller.js`) exports an object with methods:
```javascript
const usuarioCtrl = {};
usuarioCtrl.mostrarUsuarios = async (req, res) => {...};
usuarioCtrl.crearUsuario = async (req, res) => {...};
module.exports = usuarioCtrl;
```
Always return JSON responses with `.json()`, include error handling with status codes.

### 4. Passport Authentication
Located in `src/lib/passport.js`. Uses **LocalStrategy** with encrypted credentials:
- Decrypts stored credentials for comparison
- Handles file uploads with CSRF tokens
- Integration: Already configured in `root/app.js` with sessions via MySQL store

### 5. Input Validation Pattern
Router files (e.g., `src/infrastructure/http/router/user.router.js`) use **express-validator**:
# PetPocket Backend — Copilot Instructions

Concise reference for AI agents working on the backend (Express + Sequelize + Mongoose).

1) Big picture
- Entry: `root/index.js` -> `root/app.js` (Express setup). Frontend runs at `http://localhost:4200`.
- Dual DBs: MySQL via Sequelize (primary business data) and MongoDB via Mongoose (secondary/ancillary data).

2) Start / Dev commands
- `npm run dev` — nodemon -> `root/index.js` (hot reload).
- `npm start` — production entry (node `root/index.js`).

3) Key files to reference
- Server & middleware: `root/app.js`, `root/index.js`
- DB setup & relations: `src/infrastructure/Database/dataBase.orm.js`
- Encryption helpers: `src/application/controller/encrypDates.js`
- Auth: `src/lib/passport.js`
- Config: `src/config/keys.js` (contains DB creds; prefer `.env` for production)
- Controllers: `src/infrastructure/http/controller/` (each exports an object of async handlers)
- Routers & validation: `src/infrastructure/http/router/` (use `express-validator`)

4) Project-specific patterns (use these exactly)
- Encryption: fields like `emailUser`, `userName`, `phoneUser` are encrypted with `encrypt()` before persisting and `decrypt()` on read (see `encrypDates.js`).
- Dual-ORM rule: prefer one ORM per use-case: use Sequelize for core business logic; use Mongoose for logs/auxiliary data. Avoid mixing within the same function.
- Controller pattern: export an object of async methods (e.g., `module.exports = usuarioCtrl`). Always send JSON responses and appropriate status codes.
- Validation: routers apply `express-validator` arrays before controller handlers. Password policy enforced in validators (lowercase, uppercase, digit, min length).
- File uploads: configured in `root/app.js` with `express-fileupload`; uploads saved under `src/uploads/` (10MB max in config).
- CORS: dev allows `http://localhost:4200`; respect `FRONTEND_URL` env var in `root/app.js`.

5) Common tasks & examples
- Add endpoint: add model in `src/domain/models/sql/`, add controller in `src/infrastructure/http/controller/`, add router + validators in `src/infrastructure/http/router/`, import router in router index and register in `root/app.js`.
- Query example (encrypted lookup): `orm.usuario.findOne({ where: { userName: encrypt(userName) } })` then `decrypt(user.emailUser)` before returning.

6) Debugging tips
- DB issues: check `src/config/keys.js` and pool settings in `dataBase.orm.js`. Turn on Sequelize logging by setting `logging: console.log`.
- Sessions: `express-session` may use `express-mysql-session`; check session store config in `root/app.js`.

7) Safety & deployment notes
- `src/config/keys.js` holds credentials — replace with environment variables for production.
- There is no test harness in the repo; CI will need tests added.

If you want, I can (1) merge with any other AI docs found elsewhere, (2) add brief examples linking to exact lines, or (3) commit this file to the repo. Which would you like next?
6. **Model Relationships**: Set up in `src/infrastructure/Database/dataBase.orm.js` after model definitions (lines ~95+)
