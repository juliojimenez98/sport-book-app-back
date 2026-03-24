import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface ClassEnrollmentAttributes {
  enrollmentId: number;
  classId: number;
  userId?: number;
  status: "confirmed" | "cancelled";
  enrolledAt: Date;
}

interface ClassEnrollmentCreationAttributes
  extends Optional<ClassEnrollmentAttributes, "enrollmentId" | "status" | "enrolledAt"> {}

class ClassEnrollment
  extends Model<ClassEnrollmentAttributes, ClassEnrollmentCreationAttributes>
  implements ClassEnrollmentAttributes
{
  public enrollmentId!: number;
  public classId!: number;
  public userId?: number;
  public status!: "confirmed" | "cancelled";
  public enrolledAt!: Date;
}

ClassEnrollment.init(
  {
    enrollmentId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "class_id",
      references: { model: "sport_class", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: { model: "app_user", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "confirmed",
      validate: {
        isIn: [["confirmed", "cancelled"]],
      },
    },
    enrolledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "enrolled_at",
    },
  },
  {
    sequelize,
    tableName: "class_enrollment",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["class_id", "user_id"],
      },
    ],
  },
);

export default ClassEnrollment;
