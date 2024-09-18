require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { HfInference } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const hfInference = new HfInference(process.env.HF_TOKEN);

app.use(express.static(path.join(__dirname, 'public')));


// ger recipt POST
app.post('/generate-recipe', async (req, res) => {
    let { selectedIngredients } = req.body;

    if (Array.isArray(selectedIngredients)) {
        selectedIngredients = selectedIngredients.filter(ingredient => ingredient !== null && ingredient !== undefined && ingredient.trim() !== '');
    } else {
        selectedIngredients = [];
    }

    // CHECK ARRAY
    if (selectedIngredients.length < 4) {
        return res.status(400).json({ error: 'Agrega al menos 4 ingredientes.' });
    }

    const prompt = `Genera una receta con los siguientes ingredientes y su cantidad necesaria ya sea en peso, tamaño, etc: ${selectedIngredients.join(', ')}. Devuelve la receta en formato JSON con los campos "titulo", "ingredientes" e "instrucciones".`;

    try {
        const response = await hfInference.chatCompletion({
            model: "microsoft/Phi-3-mini-4k-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
        });

        const recipeContent = response.choices[0]?.message?.content || '{}';
        console.log('Contenido del JSON:', recipeContent);

        let recipeData = {
            title: "Receta Generada",
            ingredients: selectedIngredients,
            instructions: "No se pudo procesar las instrucciones."
        };

        try {
            const jsonMatch = recipeContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const jsonString = jsonMatch[1].trim();
                const cleanedJsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

                try {
                    const parsedData = JSON.parse(cleanedJsonString);

                    recipeData = {
                        title: parsedData.titulo || recipeData.title,
                        ingredients: parsedData.ingredientes || recipeData.ingredients,
                        instructions: parsedData.instrucciones || recipeData.instructions
                    };
                } catch (parseError) {
                    console.error('Error al procesar la respuesta JSON:', parseError);
                }
            }
        } catch (matchError) {
            console.error('Error al extraer JSON:', matchError);
        }

        //  dynamic import for node-fetch = deprecado
        const { default: fetch } = await import('node-fetch');

        // txt to img
        const imageResponse = await fetch(
            "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: "Generar una imagen en plato de esta receta:"+ recipeData.title }),
            }
        );
        const imageBlob = await imageResponse.buffer();
        const imageBase64 = imageBlob.toString('base64');
        recipeData.image = `data:image/png;base64,${imageBase64}`;

        res.json(recipeData);
    } catch (error) {
        console.error('Error al generar la receta:', error);
        res.status(500).send('Error al generar la receta. Asegúrate de que el servicio de Hugging Face esté disponible y que tu conexión a Internet esté funcionando correctamente.');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
