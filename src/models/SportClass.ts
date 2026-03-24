import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface SportClassAttributes {
  classId: number;
  tenantId: number;
  branchId: number;
  sportId: number;
  resourceId?: number;
  name: string;
  description?: string;
  instructor?: string;
  startsAt: Date;
  endsAt: Date;
  maxCapacity: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SportClassCreationAttributes
  extends Optional<
    SportClassAttributes,
    "classId" | "isActive" | "currency" | "maxCapacity" | "resourceId"
  > {}

class SportClass
  extends Model<SportClassAttributes, SportClassCreationAttributes>
  implements SportClassAttributes
{
  public classId!: number;
  public tenantId!: number;
  public branchId!: number;
  public sportId!: number;
  public resourceId?: number;
  public name!: string;
  public description?: string;
  public instructor?: string;
  public startsAt!: Date;
  public endsAt!: Date;
  public maxCapacity!: number;
  public price!: number;
  public currency!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SportClass.init(
  {
    classId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "tenant_id",
      references: { model: "tenant", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "branch_id",
      references: { model: "branch", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    sportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sport_id",
      references: { model: "sport", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "resource_id",
      references: { model: "resource", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructor: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "starts_at",
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "ends_at",
    },
    maxCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: "max_capacity",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "CLP",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "sport_class",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["branch_id", "starts_at"],
      },
    ],
  },
);

export default SportClass;
