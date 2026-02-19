import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface BranchAttributes {
  branchId: number;
  tenantId: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  // Location
  regionId?: string;
  comunaId?: string;
  // Amenities
  hasParking: boolean;
  hasBathrooms: boolean;
  hasShowers: boolean;
  hasLockers: boolean;
  hasWifi: boolean;
  hasCafeteria: boolean;
  hasEquipmentRental: boolean;
  amenitiesDescription?: string;
  // Booking settings
  requiresApproval: boolean;
  // Status
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BranchCreationAttributes extends Optional<
  BranchAttributes,
  | "branchId"
  | "isActive"
  | "timezone"
  | "regionId"
  | "comunaId"
  | "hasParking"
  | "hasBathrooms"
  | "hasShowers"
  | "hasLockers"
  | "hasWifi"
  | "hasCafeteria"
  | "hasEquipmentRental"
  | "amenitiesDescription"
  | "requiresApproval"
> {}

class Branch
  extends Model<BranchAttributes, BranchCreationAttributes>
  implements BranchAttributes
{
  public branchId!: number;
  public tenantId!: number;
  public name!: string;
  public slug!: string;
  public address?: string;
  public phone?: string;
  public email?: string;
  public timezone!: string;
  // Location
  public regionId?: string;
  public comunaId?: string;
  // Amenities
  public hasParking!: boolean;
  public hasBathrooms!: boolean;
  public hasShowers!: boolean;
  public hasLockers!: boolean;
  public hasWifi!: boolean;
  public hasCafeteria!: boolean;
  public hasEquipmentRental!: boolean;
  public amenitiesDescription?: string;
  // Booking settings
  public requiresApproval!: boolean;
  // Status
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Branch.init(
  {
    branchId: {
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
      onDelete: "RESTRICT",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "America/Santiago",
    },
    regionId: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: "region_id",
    },
    comunaId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "comuna_id",
    },
    // Amenities
    hasParking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_parking",
    },
    hasBathrooms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_bathrooms",
    },
    hasShowers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_showers",
    },
    hasLockers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_lockers",
    },
    hasWifi: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_wifi",
    },
    hasCafeteria: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_cafeteria",
    },
    hasEquipmentRental: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "has_equipment_rental",
    },
    amenitiesDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "amenities_description",
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "requires_approval",
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
    tableName: "branch",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["tenant_id", "slug"],
      },
    ],
  },
);

export default Branch;
