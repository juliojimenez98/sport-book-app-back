import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";
import { RoleName, RoleNameType } from "../interfaces";

interface RoleAttributes {
  roleId: number;
  name: RoleNameType;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, "roleId"> {}

class Role
  extends Model<RoleAttributes, RoleCreationAttributes>
  implements RoleAttributes
{
  public roleId!: number;
  public name!: RoleNameType;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    roleId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [
          [
            RoleName.SUPER_ADMIN,
            RoleName.TENANT_ADMIN,
            RoleName.BRANCH_ADMIN,
            RoleName.STAFF,
          ],
        ],
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "role",
    timestamps: true,
    underscored: true,
  },
);

export default Role;
