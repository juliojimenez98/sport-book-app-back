import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";
import {
  BookingStatus,
  BookingSource,
  BookingStatusType,
  BookingSourceType,
} from "../interfaces";

interface BookingAttributes {
  bookingId: number;
  tenantId: number;
  branchId: number;
  resourceId: number;
  userId?: number;
  guestId?: number;
  startAt: Date;
  endAt: Date;
  status: BookingStatusType;
  source: BookingSourceType;
  totalPrice: number;
  currency: string;
  notes?: string;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingCreationAttributes extends Optional<
  BookingAttributes,
  "bookingId" | "status" | "source" | "currency"
> {}

class Booking
  extends Model<BookingAttributes, BookingCreationAttributes>
  implements BookingAttributes
{
  public bookingId!: number;
  public tenantId!: number;
  public branchId!: number;
  public resourceId!: number;
  public userId?: number;
  public guestId?: number;
  public startAt!: Date;
  public endAt!: Date;
  public status!: BookingStatusType;
  public source!: BookingSourceType;
  public totalPrice!: number;
  public currency!: string;
  public notes?: string;
  public rejectionReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Booking.init(
  {
    bookingId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "tenant_id",
      references: {
        model: "tenant",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "branch_id",
      references: {
        model: "branch",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "resource_id",
      references: {
        model: "resource",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: "app_user",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    guestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "guest_id",
      references: {
        model: "guest",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_at",
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_at",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: BookingStatus.PENDING,
      validate: {
        isIn: [
          [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CANCELLED,
            BookingStatus.COMPLETED,
            BookingStatus.NO_SHOW,
            BookingStatus.REJECTED,
          ],
        ],
      },
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: BookingSource.WEB,
      validate: {
        isIn: [
          [
            BookingSource.WEB,
            BookingSource.APP,
            BookingSource.PHONE,
            BookingSource.WALK_IN,
          ],
        ],
      },
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "total_price",
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "CLP",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "rejection_reason",
    },
  },
  {
    sequelize,
    tableName: "booking",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["resource_id", "start_at", "end_at"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["guest_id"],
      },
      {
        fields: ["tenant_id", "branch_id"],
      },
    ],
    validate: {
      userOrGuest() {
        if ((this.userId && this.guestId) || (!this.userId && !this.guestId)) {
          throw new Error(
            "Booking must have either userId OR guestId, not both or neither",
          );
        }
      },
    },
  },
);

export default Booking;
