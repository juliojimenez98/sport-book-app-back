import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BranchHoursAttributes {
  branchHoursId: number;
  branchId: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // HH:MM format
  closeTime: string;
  isClosed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BranchHoursCreationAttributes extends Optional<
  BranchHoursAttributes,
  "branchHoursId" | "isClosed"
> {}

class BranchHours
  extends Model<BranchHoursAttributes, BranchHoursCreationAttributes>
  implements BranchHoursAttributes
{
  public branchHoursId!: number;
  public branchId!: number;
  public dayOfWeek!: number;
  public openTime!: string;
  public closeTime!: string;
  public isClosed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BranchHours.init(
  {
    branchHoursId: {
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
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "day_of_week",
      validate: {
        min: 0,
        max: 6,
      },
    },
    openTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: "open_time",
    },
    closeTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: "close_time",
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_closed",
    },
  },
  {
    sequelize,
    tableName: "branch_hours",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["branch_id", "day_of_week"],
      },
    ],
  },
);

export default BranchHours;
