import { Model, DataTypes } from "sequelize";
import sequelize from "../db/connection";

export interface TenantImageAttributes {
  tenantImageId?: number;
  tenantId: number;
  imageUrl: string;
  isPrimary?: boolean;
}

class TenantImage
  extends Model<TenantImageAttributes>
  implements TenantImageAttributes
{
  public tenantImageId!: number;
  public tenantId!: number;
  public imageUrl!: string;
  public isPrimary!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TenantImage.init(
  {
    tenantImageId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "tenant_id",
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
    tableName: "tenant_image",
    timestamps: true,
    underscored: true,
  }
);

export default TenantImage;
