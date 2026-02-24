import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";
import { DiscountTypeEnum, DiscountConditionTypeEnum, DiscountType, DiscountConditionType } from "../interfaces";

interface DiscountAttributes {
  discountId: number;
  tenantId: number;
  branchId?: number;
  name: string;
  code?: string;
  type: DiscountTypeEnum;
  value: number;
  conditionType: DiscountConditionTypeEnum;
  daysOfWeek?: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0 is Sunday
  startTime?: string; // "10:00"
  endTime?: string; // "14:00"
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiscountCreationAttributes extends Optional<DiscountAttributes, "discountId" | "isActive" | "branchId" | "code" | "daysOfWeek" | "startTime" | "endTime"> {}

class Discount extends Model<DiscountAttributes, DiscountCreationAttributes> implements DiscountAttributes {
  public discountId!: number;
  public tenantId!: number;
  public branchId?: number;
  public name!: string;
  public code?: string;
  public type!: DiscountTypeEnum;
  public value!: number;
  public conditionType!: DiscountConditionTypeEnum;
  public daysOfWeek?: number[];
  public startTime?: string;
  public endTime?: string;
  public isActive!: boolean;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Discount.init({
  discountId: {
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
    onDelete: "CASCADE",
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "branch_id",
    references: {
      model: "branch",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [[DiscountType.PERCENTAGE, DiscountType.FIXED_AMOUNT]],
    },
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  conditionType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: "condition_type",
    validate: {
      isIn: [[DiscountConditionType.PROMO_CODE, DiscountConditionType.TIME_BASED]],
    },
  },
  daysOfWeek: {
    type: DataTypes.JSON,
    allowNull: true,
    field: "days_of_week",
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: "start_time",
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: "end_time",
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: "is_active",
  },
}, {
  sequelize,
  tableName: "discount",
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ["tenant_id"],
    },
    {
      fields: ["code"],
      unique: true, // we can make promo codes unique globally or per tenant. Let's start simple, maybe unique where code is not null. Wait, let's keep it just indexing.
    }
  ],
});

export default Discount;
