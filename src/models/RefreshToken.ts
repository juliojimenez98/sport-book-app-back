import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface RefreshTokenAttributes {
  refreshTokenId: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RefreshTokenCreationAttributes extends Optional<
  RefreshTokenAttributes,
  "refreshTokenId"
> {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public refreshTokenId!: number;
  public userId!: number;
  public tokenHash!: string;
  public expiresAt!: Date;
  public revokedAt?: Date;
  public userAgent?: string;
  public ipAddress?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  public isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }
}

RefreshToken.init(
  {
    refreshTokenId: {
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
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "token_hash",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "user_agent",
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "ip_address",
    },
  },
  {
    sequelize,
    tableName: "refresh_token",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["token_hash"],
      },
    ],
  },
);

export default RefreshToken;
