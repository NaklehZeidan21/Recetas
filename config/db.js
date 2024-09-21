// config/db.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306,
        logging: false,
    }
);

const connectToDatabase = async () => {
    try {
      
       
        console.log('Conexión a la base de datos exitosa.');
        // Sincroniza modelos aquí o en el archivo principal
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
    }
};

export { sequelize, connectToDatabase };
