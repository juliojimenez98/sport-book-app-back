import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../db/connection';
import { RoleScope, RoleScopeType } from '../interfaces';

interface UserRoleAttributes {
  id: number;
  userId: number;
  roleId: number;
  scope: RoleScopeType;
  tenantId?: number;
  branchId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'id'> {}

class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public id!: number;
  public userId!: number;
  public roleId!: number;
  public scope!: RoleScopeType;
  public tenantId?: number;
  public branchId?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserRole.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'app_user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'role',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    scope: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [[RoleScope.GLOBAL, RoleScope.TENANT, RoleScope.BRANCH]],
      },
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tenant_id',
      references: {
        model: 'tenant',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'branch_id',
      references: {
        model: 'branch',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'user_role',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role_id', 'tenant_id', 'branch_id'],
      },
    ],
  }
);

export default UserRole;
