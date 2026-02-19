import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BlockedSlotAttributes {
  blockedSlotId: number;
  branchId: number;
  resourceId?: number | null; // null = all resources in branch
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BlockedSlotCreationAttributes extends Optional<
  BlockedSlotAttributes,
  "blockedSlotId" | "resourceId" | "reason" | "createdBy"
> {}

class BlockedSlot
  extends Model<BlockedSlotAttributes, BlockedSlotCreationAttributes>
  implements BlockedSlotAttributes
{
  public blockedSlotId!: number;
  public branchId!: number;
  public resourceId!: number | null;
  public date!: string;
  public startTime!: string;
  public endTime!: string;
  public reason!: string;
  public createdBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BlockedSlot.init(
  {
    blockedSlotId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
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
      onDelete: "CASCADE",
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "resource_id",
      references: {
        model: "resource",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: "start_time",
    },
    endTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: "end_time",
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
      references: {
        model: "app_user",
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "blocked_slot",
    timestamps: true,
    underscored: true,
  },
);

export default BlockedSlot;
