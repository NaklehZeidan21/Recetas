import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const hfInference = new HfInference(process.env.HF_TOKEN);

app.use(express.static(path.join(__dirname, 'public')));

app.post('/generate-recipe', async (req, res) => {
    let { selectedIngredients } = req.body;

    if (Array.isArray(selectedIngredients)) {
        selectedIngredients = selectedIngredients.filter(ingredient => ingredient !== null && ingredient !== undefined && ingredient.trim() !== '');
    } else {
        selectedIngredients = [];
    }

    if (selectedIngredients.length < 4) {
        return res.status(400).json({ error: 'Agrega al menos 4 ingredientes.' });
    }

    const prompt = `Genera una receta con los siguientes ingredientes: ${selectedIngredients.join(', ')}. Devuelve el resultado en formato JSON con la estructura: 
        {
            title: "",
            ingredients: [{ nombre: "", cantidad: "" }],
            instructions: [""]
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
            image: ""         };

        const jsonMatch = recipeContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1].trim();
            const cleanedJsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

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

app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
