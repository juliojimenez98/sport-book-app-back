import { Model, DataTypes } from "sequelize";
import sequelize from "../db/connection";

export interface ResourceImageAttributes {
  resourceImageId?: number;
  resourceId: number;
  imageUrl: string;
  isPrimary?: boolean;
}

class ResourceImage
  extends Model<ResourceImageAttributes>
  implements ResourceImageAttributes
{
  public resourceImageId!: number;
  public resourceId!: number;
  public imageUrl!: string;
  public isPrimary!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ResourceImage.init(
  {
    resourceImageId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "resource_id",
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
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
    tableName: "resource_image",
    timestamps: true,
    underscored: true,
  }
);

export default ResourceImage;
