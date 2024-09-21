
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Recipe = sequelize.define('Recipe', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ingredients: {
        type: DataTypes.JSON, 
        allowNull: false,
    },
    instructions: {
        type: DataTypes.JSON, 
        allowNull: false,
    },
    image: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
}, {
    timestamps: true,
});

User.hasMany(Recipe, { foreignKey: 'userId', as: 'recipes' });
Recipe.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Recipe;
