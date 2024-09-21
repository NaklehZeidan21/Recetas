import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { connectToDatabase } from './config/db.js'; 
import authRoutes from './routes/authRoutes.js'; 
import { authMiddleware } from './middlewares/authMiddleware.js'; 
import { sequelize } from './config/db.js'; 
import recipeRoutes from './routes/recipeRoutes.js';



dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());


// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ruta a la carpeta de vistas



const hfInference = new HfInference(process.env.HF_TOKEN);

app.use(express.static(path.join(__dirname, 'public')));

/////
const startServer = async () => {
    try {
        await connectToDatabase(); // Inicializa la conexión a la base de datos
        await sequelize.sync({ force: false }); // Esto eliminará y volverá a crear todas las tablas
        console.log('Tablas sincronizadas exitosamente.');
        app.listen(3000, () => {
            console.log('Servidor corriendo en el puerto 3000');
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
    }
};


startServer();


app.use('/api', recipeRoutes);


// Rutas de autenticación
app.use('/api/auth', authRoutes);


// Ruta para renderizar el dashboard en /my-recipes
app.get('/my-recipes', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});


// Ruta protegida como ejemplo
app.get('/protected', authMiddleware, (req, res) => {
    res.send('Ruta protegida, acceso permitido.');
});

app.post('/generate-recipe', async (req, res) => {
    let { selectedIngredients } = req.body;

    if (Array.isArray(selectedIngredients)) {
        selectedIngredients = selectedIngredients.filter(ingredient => ingredient !== null && ingredient !== undefined && ingredient.trim() !== '');
    } else {
        selectedIngredients = [];
    }

    if (selectedIngredients.length < 5) {
        return res.status(400).json({ error: 'Agrega al menos 5 ingredientes.' });
    }

    const prompt = `Genera una receta con los siguientes ingredientes: ${selectedIngredients.join(', ')}. Devuelve el resultado en formato JSON con la estructura: 
    {
        "title": "",
        "ingredients": [{"nombre": "", "cantidad": ""}],
        "instructions": [""]
    }`;

    try {
        // Generar receta usando Hugging Face
        const response = await hfInference.chatCompletion({
            model: "microsoft/Phi-3-mini-4k-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
        });

        const recipeContent = response.choices[0]?.message?.content || '{}';
        let recipeData = {
            title: "Receta Generada",
            ingredients: selectedIngredients.map(ingredient => ({ nombre: ingredient, cantidad: "No especificada" })),
            instructions: ["No se pudo procesar las instrucciones."],
            image: ""
        };

        // Extraer JSON válido usando regex
        const jsonMatch = recipeContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1].trim();
            const cleanedJsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

            // Atrapar errores de parsing
            try {
                const parsedData = JSON.parse(cleanedJsonString);

                recipeData = {
                    title: parsedData.title || recipeData.title,
                    ingredients: parsedData.ingredients ? parsedData.ingredients.map(ingredient => ({
                        nombre: ingredient.nombre || '',
                        cantidad: ingredient.cantidad || 'No especificada'
                    })) : recipeData.ingredients,
                    instructions: parsedData.instructions || recipeData.instructions,
                    image: ""
                };
            } catch (jsonError) {
                console.error('Error al analizar el JSON:', jsonError);
            }
        }

        // Generar imagen después de generar la receta
        const imagePrompt = `Generar una imagen para un plato de esta receta: ${recipeData.title}`;

        const imageResponse = await fetch(
            "https://api-inference.huggingface.co/models/ZB-Tech/Text-to-Image",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: imagePrompt }),
            }
        );

        if (imageResponse.ok) {
            const imageBlob = await imageResponse.buffer();
            const imageBase64 = imageBlob.toString('base64');
            recipeData.image = `data:image/png;base64,${imageBase64}`; 
        } else {
            console.error('Error al generar la imagen:', await imageResponse.text());
        }

        // Enviar receta completa
        res.json(recipeData);

    } catch (error) {
        console.error('Error al generar la receta:', error);
        res.status(500).send('Error al generar la receta.');
    }
});




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/*', function(req, res){
    res.status(404).send('404');
  });