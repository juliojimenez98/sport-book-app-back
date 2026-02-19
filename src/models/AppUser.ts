import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface AppUserAttributes {
  userId: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  emailVerifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AppUserCreationAttributes extends Optional<
  AppUserAttributes,
  "userId" | "isActive"
> {}

class AppUser
  extends Model<AppUserAttributes, AppUserCreationAttributes>
  implements AppUserAttributes
{
  public userId!: number;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public isActive!: boolean;
  public emailVerifiedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AppUser.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "email_verified_at",
    },
  },
  {
    sequelize,
    tableName: "app_user",
    timestamps: true,
    underscored: true,
  },
);

export default AppUser;
