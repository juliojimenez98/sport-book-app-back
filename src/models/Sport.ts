import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../db/connection';

interface SportAttributes {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SportCreationAttributes extends Optional<SportAttributes, 'id' | 'isActive'> {}

class Sport extends Model<SportAttributes, SportCreationAttributes> implements SportAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public iconUrl?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Sport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    iconUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'icon_url',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'sport',
    timestamps: true,
    underscored: true,
  }
);

export default Sport;
