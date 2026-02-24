import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../db/connection";

interface SurveyResponseAttributes {
  surveyId: number;
  bookingId: number;
  resourceCondition?: number;
  amenitiesRating?: number;
  attentionRating?: number;
  punctualityRating?: number;
  comments?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SurveyResponseCreationAttributes extends Optional<SurveyResponseAttributes, "surveyId"> {}

class SurveyResponse extends Model<SurveyResponseAttributes, SurveyResponseCreationAttributes> implements SurveyResponseAttributes {
  public surveyId!: number;
  public bookingId!: number;
  public resourceCondition?: number;
  public amenitiesRating?: number;
  public attentionRating?: number;
  public punctualityRating?: number;
  public comments?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SurveyResponse.init({
  surveyId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: "id",
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "booking_id",
    references: {
      model: "booking",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    unique: true, // One survey per booking
  },
  resourceCondition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "resource_condition",
    validate: { min: 1, max: 5 },
  },
  amenitiesRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "amenities_rating",
    validate: { min: 1, max: 5 },
  },
  attentionRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "attention_rating",
    validate: { min: 1, max: 5 },
  },
  punctualityRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "punctuality_rating",
    validate: { min: 1, max: 5 },
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: "survey_response",
  timestamps: true,
  underscored: true,
});

export default SurveyResponse;
