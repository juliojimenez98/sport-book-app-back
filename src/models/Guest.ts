import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface GuestAttributes {
  guestId: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GuestCreationAttributes extends Optional<
  GuestAttributes,
  "guestId"
> {}

class Guest
  extends Model<GuestAttributes, GuestCreationAttributes>
  implements GuestAttributes
{
  public guestId!: number;
  public tenantId!: number;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Guest.init(
  {
    guestId: {
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "guest",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["tenant_id", "email"],
      },
    ],
  },
);

export default Guest;
