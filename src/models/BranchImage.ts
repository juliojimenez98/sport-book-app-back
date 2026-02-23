import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BranchImageAttributes {
  branchImageId: number;
  branchId: number;
  imageUrl: string;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BranchImageCreationAttributes
  extends Optional<BranchImageAttributes, "branchImageId" | "isPrimary"> {}

class BranchImage
  extends Model<BranchImageAttributes, BranchImageCreationAttributes>
  implements BranchImageAttributes
{
  public branchImageId!: number;
  public branchId!: number;
  public imageUrl!: string;
  public isPrimary!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BranchImage.init(
  {
    branchImageId: {
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
    imageUrl: {
      type: DataTypes.STRING(1000), // Allowing long keys
      allowNull: false,
      field: "image_url",
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_primary",
    },
  },
  {
    sequelize,
    tableName: "branch_image",
    timestamps: true,
    underscored: true,
  },
);

export default BranchImage;
