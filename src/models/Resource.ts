import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface ResourceAttributes {
  id: number;
  branchId: number;
  sportId: number;
  name: string;
  description?: string;
  pricePerHour: number;
  currency: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ResourceCreationAttributes extends Optional<
  ResourceAttributes,
  "id" | "isActive" | "currency"
> {}

class Resource
  extends Model<ResourceAttributes, ResourceCreationAttributes>
  implements ResourceAttributes
{
  public id!: number;
  public branchId!: number;
  public sportId!: number;
  public name!: string;
  public description?: string;
  public pricePerHour!: number;
  public currency!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Resource.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    sportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sport_id",
      references: {
        model: "sport",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    pricePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "price_per_hour",
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
    tableName: "resource",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["branch_id", "name"],
      },
    ],
  },
);

export default Resource;
