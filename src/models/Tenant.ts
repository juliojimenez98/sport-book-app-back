import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface TenantAttributes {
  tenantId: number;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TenantCreationAttributes extends Optional<
  TenantAttributes,
  "tenantId" | "isActive"
> {}

class Tenant
  extends Model<TenantAttributes, TenantCreationAttributes>
  implements TenantAttributes
{
  public tenantId!: number;
  public name!: string;
  public slug!: string;
  public email?: string;
  public phone?: string;
  public logoUrl?: string;
  public primaryColor?: string;
  public secondaryColor?: string;
  public accentColor?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Tenant.init(
  {
    tenantId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "logo_url",
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: "primary_color",
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: "secondary_color",
    },
    accentColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: "accent_color",
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
    tableName: "tenant",
    timestamps: true,
    underscored: true,
  },
);

export default Tenant;
