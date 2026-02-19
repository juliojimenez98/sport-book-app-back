import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BranchSportAttributes {
  branchSportId: number;
  branchId: number;
  sportId: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BranchSportCreationAttributes extends Optional<
  BranchSportAttributes,
  "branchSportId" | "isActive"
> {}

class BranchSport
  extends Model<BranchSportAttributes, BranchSportCreationAttributes>
  implements BranchSportAttributes
{
  public branchSportId!: number;
  public branchId!: number;
  public sportId!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BranchSport.init(
  {
    branchSportId: {
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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "branch_sport",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["branch_id", "sport_id"],
      },
    ],
  },
);

export default BranchSport;
