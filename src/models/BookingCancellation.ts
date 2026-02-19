import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BookingCancellationAttributes {
  bookingCancellationId: number;
  bookingId: number;
  cancelledBy?: number;
  reason?: string;
  cancelledAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingCancellationCreationAttributes extends Optional<
  BookingCancellationAttributes,
  "bookingCancellationId" | "cancelledAt"
> {}

class BookingCancellation
  extends Model<
    BookingCancellationAttributes,
    BookingCancellationCreationAttributes
  >
  implements BookingCancellationAttributes
{
  public bookingCancellationId!: number;
  public bookingId!: number;
  public cancelledBy?: number;
  public reason?: string;
  public cancelledAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BookingCancellation.init(
  {
    bookingCancellationId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "booking_id",
      references: {
        model: "booking",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    cancelledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "cancelled_by",
      references: {
        model: "app_user",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "cancelled_at",
    },
  },
  {
    sequelize,
    tableName: "booking_cancellation",
    timestamps: true,
    underscored: true,
  },
);

export default BookingCancellation;
