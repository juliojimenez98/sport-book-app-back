import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface UserCardAttributes {
  userCardId: number;
  userId: number;
  cardHolderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCardCreationAttributes extends Optional<UserCardAttributes, "userCardId" | "isDefault"> {}

class UserCard extends Model<UserCardAttributes, UserCardCreationAttributes> implements UserCardAttributes {
  public userCardId!: number;
  public userId!: number;
  public cardHolderName!: string;
  public brand!: string;
  public last4!: string;
  public expMonth!: number;
  public expYear!: number;
  public isDefault!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserCard.init({
  userCardId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: "id",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "user_id",
    references: {
      model: "app_user",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  cardHolderName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: "card_holder_name",
  },
  brand: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  last4: {
    type: DataTypes.STRING(4),
    allowNull: false,
    field: "last_4",
  },
  expMonth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "exp_month",
  },
  expYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "exp_year",
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "is_default",
  },
}, {
  sequelize,
  tableName: "user_card",
  timestamps: true,
  underscored: true,
});

export default UserCard;
