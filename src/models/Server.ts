import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import sequelize, {
  testConnection,
  syncDatabase,
  initializeExtensions,
} from "../db/connection";
import { errorHandler } from "../middlewares/errorHandler";

// Import routes
import authRoutes from "../routes/auth.routes";
import tenantRoutes from "../routes/tenant.routes";
import branchRoutes from "../routes/branch.routes";
import sportRoutes from "../routes/sport.routes";
import resourceRoutes from "../routes/resource.routes";
import bookingRoutes from "../routes/booking.routes";
import userRoutes from "../routes/user.routes";
import publicRoutes from "../routes/public.routes";
import uploadRoutes from "../routes/upload.routes";
import { getAsset } from "../controllers/upload.controller";

// Import associations to set up relationships
import "../models/associations";

dotenv.config();

class Server {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "3000", 10);

    this.middlewares();
    this.routes();
    this.errorHandling();
  }

  private middlewares(): void {
    // Security middlewares
    this.app.use(helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }));
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
      }),
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging in development
    if (process.env.NODE_ENV === "development") {
      this.app.use((req: Request, _res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }
  }

  private routes(): void {
    // Health check
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    this.app.use("/api/public", publicRoutes); // Public endpoints (no auth required)
    this.app.use("/api/public/assets", getAsset); // Temporary direct mount for assets
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/tenants", tenantRoutes);
    this.app.use("/api/branches", branchRoutes);
    this.app.use("/api/sports", sportRoutes);
    this.app.use("/api/resources", resourceRoutes);
    this.app.use("/api/bookings", bookingRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/upload", uploadRoutes);

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: "Endpoint not found",
      });
    });
  }

  private errorHandling(): void {
    this.app.use(errorHandler);
  }

  public async initializeDatabase(): Promise<void> {
    try {
      await testConnection();
      await initializeExtensions();
      await syncDatabase(false);
      await this.createExclusionConstraint();
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async createExclusionConstraint(): Promise<void> {
    try {
      // Create the exclusion constraint for anti-overbooking
      // This prevents overlapping bookings for the same resource
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'booking_no_overlap'
          ) THEN
            ALTER TABLE booking ADD CONSTRAINT booking_no_overlap
            EXCLUDE USING gist (
              resource_id WITH =,
              tstzrange(start_at, end_at, '[)') WITH &&
            ) WHERE (status IN ('pending', 'confirmed'));
          END IF;
        END $$;
      `);
      console.log(
        "✅ Exclusion constraint for booking overlap created/verified.",
      );
    } catch (error) {
      console.error(
        "⚠️ Could not create exclusion constraint (may already exist):",
        error,
      );
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initializeDatabase();

      this.app.listen(this.port, () => {
        console.log(`🚀 Server is running on port ${this.port}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default Server;
