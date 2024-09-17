require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { HfInference } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Obtener el token de Hugging Face desde las variables de entorno
const hfInference = new HfInference(process.env.HF_TOKEN);

// Servir archivos estáticos (incluyendo index.html en la carpeta "public")
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para generar receta
app.post('/generate-recipe', async (req, res) => {
    const { selectedIngredients } = req.body;

    // Crear el mensaje para enviar al modelo
    const prompt = `Generame una receta con los siguientes ingredientes: ${selectedIngredients.join(', ')}.`;

    try {
        // Enviar la solicitud al modelo de Hugging Face
        let recipe = '';
        for await (const chunk of hfInference.chatCompletionStream({
            model: "microsoft/Phi-3-mini-4k-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
        })) {
            recipe += chunk.choices[0]?.delta?.content || '';
        }

        // Devolver la receta generada
        res.json({ recipe });
    } catch (error) {
        console.error('Error al generar la receta:', error);
        res.status(500).send('Error al generar la receta.');
    }
});

// Servir index.html como ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
