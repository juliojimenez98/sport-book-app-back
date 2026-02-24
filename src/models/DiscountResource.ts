import { Model, DataTypes } from "sequelize";
import sequelize from "../db/connection";

interface DiscountResourceAttributes {
  discountId: number;
  resourceId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class DiscountResource extends Model<DiscountResourceAttributes> implements DiscountResourceAttributes {
  public discountId!: number;
  public resourceId!: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DiscountResource.init({
  discountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: "discount_id",
    references: {
      model: "discount",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: "resource_id",
    references: {
      model: "resource",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
}, {
  sequelize,
  tableName: "discount_resource",
  timestamps: true,
  underscored: true,
});

export default DiscountResource;
