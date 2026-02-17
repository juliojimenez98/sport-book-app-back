# Booking Platform Backend

Sistema de reservas multi-tenant para canchas deportivas.

## Características

- **Multi-tenant**: Soporte para múltiples empresas (tenants)
- **Multi-sucursal**: Cada tenant puede tener múltiples sucursales (branches)
- **Multi-deporte**: Soporte para diferentes deportes
- **Reservas**: Como usuario registrado o como invitado
- **Control de acceso basado en roles (RBAC)**:
  - `super_admin`: Acceso total al sistema
  - `tenant_admin`: Administra su empresa
  - `branch_admin`: Administra una sucursal
  - `staff`: Operador de sucursal
- **Anti-overbooking**: Constraint de exclusión en PostgreSQL para evitar solapamientos
- **JWT Auth**: Access token (corto) + Refresh token (largo) con rotación

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

## Instalación

1. Clonar el repositorio

2. Instalar dependencias:
```bash
cd backend
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar `.env` con tus valores:
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=booking_platform
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_ACCESS_SECRET=tu_secret_de_acceso_minimo_32_caracteres
JWT_REFRESH_SECRET=tu_secret_de_refresh_minimo_32_caracteres
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

5. Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE booking_platform;
```

6. Ejecutar el seed (esto crea las tablas y datos de ejemplo):
```bash
npm run seed
```

7. Iniciar el servidor en modo desarrollo:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## Scripts disponibles

- `npm run dev` - Inicia el servidor en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción
- `npm run seed` - Ejecuta el seed de la base de datos

## Estructura del proyecto

```
backend/
├── src/
│   ├── app.ts                 # Entry point
│   ├── controllers/           # Controladores por entidad
│   │   ├── auth.controller.ts
│   │   ├── tenant.controller.ts
│   │   ├── branch.controller.ts
│   │   ├── sport.controller.ts
│   │   ├── resource.controller.ts
│   │   ├── booking.controller.ts
│   │   └── user.controller.ts
│   ├── db/
│   │   ├── connection.ts      # Conexión Sequelize
│   │   └── seed.ts            # Seed de datos
│   ├── helpers/
│   │   ├── jwt.ts             # Utilidades JWT
│   │   ├── password.ts        # Hashing de contraseñas
│   │   └── utils.ts           # Utilidades generales
│   ├── interfaces/
│   │   └── index.ts           # Tipos TypeScript compartidos
│   ├── middlewares/
│   │   ├── authenticate.ts    # Middleware de autenticación
│   │   ├── authorize.ts       # Middleware RBAC
│   │   ├── errorHandler.ts    # Manejo de errores
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   └── validate.ts        # Validación con Zod
│   ├── models/
│   │   ├── Server.ts          # Clase Server (Express)
│   │   ├── associations.ts    # Asociaciones entre modelos
│   │   ├── Tenant.ts
│   │   ├── Branch.ts
│   │   ├── Sport.ts
│   │   ├── BranchSport.ts
│   │   ├── Resource.ts
│   │   ├── AppUser.ts
│   │   ├── Guest.ts
│   │   ├── Booking.ts
│   │   ├── BookingCancellation.ts
│   │   ├── Role.ts
│   │   ├── UserRole.ts
│   │   ├── BranchHours.ts
│   │   └── RefreshToken.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tenant.routes.ts
│   │   ├── branch.routes.ts
│   │   ├── sport.routes.ts
│   │   ├── resource.routes.ts
│   │   ├── booking.routes.ts
│   │   └── user.routes.ts
│   └── validators/
│       └── schemas.ts         # Esquemas Zod
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar tokens
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Tenants (super_admin)
- `GET /api/tenants` - Listar tenants
- `POST /api/tenants` - Crear tenant
- `GET /api/tenants/:id` - Obtener tenant
- `PUT /api/tenants/:id` - Actualizar tenant
- `DELETE /api/tenants/:id` - Eliminar tenant
- `GET /api/tenants/:tenantId/branches` - Listar sucursales
- `POST /api/tenants/:tenantId/branches` - Crear sucursal

### Branches
- `GET /api/branches` - Listar sucursales accesibles
- `GET /api/branches/:id` - Obtener sucursal (público)
- `PUT /api/branches/:id` - Actualizar sucursal
- `DELETE /api/branches/:id` - Eliminar sucursal
- `GET /api/branches/:branchId/sports` - Listar deportes (público)
- `POST /api/branches/:branchId/sports` - Añadir deporte
- `DELETE /api/branches/:branchId/sports/:sportId` - Quitar deporte
- `GET /api/branches/:branchId/resources` - Listar canchas (público)
- `POST /api/branches/:branchId/resources` - Crear cancha
- `GET /api/branches/:branchId/bookings` - Listar reservas (admin)

### Sports (super_admin para CUD)
- `GET /api/sports` - Listar deportes (público)
- `POST /api/sports` - Crear deporte
- `PUT /api/sports/:id` - Actualizar deporte
- `DELETE /api/sports/:id` - Eliminar deporte

### Resources
- `GET /api/resources/:id` - Obtener cancha (público)
- `PUT /api/resources/:id` - Actualizar cancha
- `DELETE /api/resources/:id` - Eliminar cancha
- `GET /api/resources/:resourceId/calendar` - Calendario de reservas (público)

### Bookings
- `POST /api/bookings` - Crear reserva (usuario o invitado)
- `GET /api/bookings/:id` - Obtener reserva
- `POST /api/bookings/:id/cancel` - Cancelar reserva
- `PUT /api/bookings/:id/confirm` - Confirmar reserva (admin)

### Users
- `GET /api/users/me/bookings` - Mis reservas
- `GET /api/users` - Listar usuarios (admin)
- `GET /api/users/:id` - Obtener usuario
- `POST /api/users/:userId/roles` - Asignar rol
- `DELETE /api/users/:userId/roles/:roleId` - Quitar rol
- `GET /api/users/roles` - Listar roles

## Usuarios de prueba

Después de ejecutar el seed, puedes usar:

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Super Admin | superadmin@sistema.com | SuperAdmin123! | super_admin |
| Tenant Admin 1 | admin@deportesunidos.com | TenantAdmin123! | tenant_admin |
| Tenant Admin 2 | admin@centroelite.com | TenantAdmin123! | tenant_admin |
| Branch Admin | branchadmin@centroelite.com | BranchAdmin123! | branch_admin |
| Staff | staff@centroelite.com | Staff123! | staff |
| Usuario | usuario@test.com | User123! | (ninguno) |

## Ejemplo de uso

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@sistema.com", "password": "SuperAdmin123!"}'
```

### Crear reserva como invitado
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": 1,
    "startAt": "2026-02-04T10:00:00Z",
    "endAt": "2026-02-04T11:00:00Z",
    "guest": {
      "email": "invitado@test.com",
      "firstName": "Test",
      "lastName": "Guest"
    }
  }'
```

### Ver calendario de una cancha
```bash
curl "http://localhost:3000/api/resources/1/calendar?from=2026-02-01&to=2026-02-28"
```

## Contrato para Frontend

El archivo `src/interfaces/index.ts` contiene todos los tipos TypeScript que el frontend puede usar:

- `BookingStatus`, `BookingSource`, `RoleScope`, `RoleName` - Constantes
- `TokenPayload`, `AuthTokens`, `LoginResponse` - Auth
- `UserResponse`, `TenantResponse`, `BranchResponse` - Entidades
- `ResourceResponse`, `BookingResponse`, `GuestResponse` - Entidades
- `CalendarSlot`, `CalendarResponse` - Calendario
- `PaginationQuery`, `PaginatedResponse<T>` - Paginación

## Seguridad implementada

- ✅ JWT con Access Token (15min) + Refresh Token (7 días)
- ✅ Refresh token almacenado hasheado en DB
- ✅ Rotación de refresh tokens
- ✅ Hash de contraseñas con bcrypt
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Rate limiting en auth y bookings
- ✅ Validación de inputs con Zod
- ✅ RBAC middleware
- ✅ Anti-overbooking con exclusion constraint
