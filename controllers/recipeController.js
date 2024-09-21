import fetch from 'node-fetch';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import Recipe from '../models/Recipe.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const hfInference = new HfInference(process.env.HF_TOKEN);

export const generateAndSaveRecipe = async (req, res) => {
    let { selectedIngredients } = req.body;
    const userId = req.userId; 

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
      // Hugging Face
        let response;
        try {
            response = await hfInference.chatCompletion({
                model: "microsoft/Phi-3-mini-4k-instruct",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
            });
        } catch (hfError) {
            console.error('Error al obtener la receta de Hugging Face:', hfError);
            return res.status(500).json({ error: 'Error al generar la receta.' });
        }

        const recipeContent = response.choices[0]?.message?.content || '{}';
        let recipeData = {
            title: "Receta Generada",
            ingredients: selectedIngredients.map(ingredient => ({ nombre: ingredient, cantidad: "No especificada" })),
            instructions: ["No se pudo procesar las instrucciones."],
            image: ""
        };

        // Extraer JSON válido usando regex para encontrar bloques de código JSON
        const jsonMatch = recipeContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1].trim();
        
            try {
                // Limpiar y sanitizar el JSON
                const cleanedJsonString = jsonString
                    .replace(/([{,])(\s*)(\w+)(\s*):/g, '$1"$3":') // Agregar comillas a las claves sin comillas
                    .replace(/,(\s*[\]}])/g, '$1'); // Eliminar comas finales innecesarias antes de corchetes/corchetes de cierre
        
                const parsedData = JSON.parse(cleanedJsonString);
        
                // Actualizar los datos de la receta con la información extraída
                recipeData = {
                    title: parsedData.title || recipeData.title,
                    ingredients: parsedData.ingredients ? parsedData.ingredients.map(ingredient => ({
                        nombre: ingredient.nombre || '',
                        cantidad: ingredient.cantidad || 'No especificada'
                    })) : recipeData.ingredients,
                    instructions: parsedData.instructions || recipeData.instructions,
                    image: recipeData.image  // Mantener el campo de imagen
                };
            } catch (parseError) {
                console.error('Error al parsear el JSON de la receta:', parseError);
            }
        }
                

        // generar la imagen
        try {
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
        } catch (imageError) {
            console.error('Error durante la generación de la imagen:', imageError);
            recipeData.image = '';  
        }

        //  guardar la receta en la base de datos
        try {
            const newRecipe = await Recipe.create({
                userId,
                title: recipeData.title,
                ingredients: JSON.stringify(recipeData.ingredients),
                instructions: JSON.stringify(recipeData.instructions),
                image: recipeData.image
            });

            res.json({ message: 'Receta generada y guardada exitosamente.', recipe: newRecipe });
        } catch (dbError) {
            console.error('Error al guardar la receta en la base de datos:', dbError);
            return res.status(500).json({ error: 'Error al guardar la receta.' });
        }

    } catch (error) {
        console.error('Error inesperado en el proceso de generación de receta:', error);
        res.status(500).send('Error inesperado al generar la receta.');
    }
};




export const getUserRecipes = async (req, res) => {
    const userId = req.userId;
    try {
        const recipes = await Recipe.findAll({ where: { userId } });
        res.json(recipes);
    } catch (error) {
        console.error('Error al obtener las recetas del usuario:', error);
        res.status(500).json({ error: 'Error al obtener recetas.' });
    }
};




// Controlador para compartir recetas
export const shareRecipe = async (req, res) => {
    const { recipeId } = req.params; // ID de la receta a compartir
    const userId = req.userId; // ID del usuario autenticado

    try {
        // Verificar que la receta pertenece al usuario
        const recipe = await Recipe.findOne({ where: { id: recipeId, userId } });

        if (!recipe) {
            return res.status(403).json({ error: 'No tienes permiso para compartir esta receta.' });
        }

        // Generar un ID único para la receta compartida
        const shareId = uuidv4();

        // Guardar el ID en la receta para su acceso público
        recipe.shareId = shareId; // Asegúrate de que tu modelo permite este campo
        await recipe.save();

        const shareUrl = `${req.protocol}://${req.get('host')}/api/shared/${shareId}`;
        res.json({ message: 'Receta compartida exitosamente.', shareUrl });
    } catch (error) {
        console.error('Error al compartir la receta:', error);
        res.status(500).json({ error: 'Hubo un error al intentar compartir la receta.' });
    }
};

export const getSharedRecipe = async (req, res) => {
    const { shareId } = req.params;

    try {
        const recipe = await Recipe.findOne({ where: { shareId } });

        if (!recipe) {
            return res.status(404).render('404'); // Renderiza una vista de error 404 si la receta no se encuentra
        }

        // Renderiza la vista EJS con los datos de la receta
        res.render('shared-recipe', { recipe });
    } catch (error) {
        console.error('Error al obtener la receta compartida:', error);
        res.status(500).render('error', { message: 'Hubo un error al intentar obtener la receta.' });
    }
};



export const deleteRecipe = async (req, res) => {
    const { recipeId } = req.params; 
        const userId = req.userId; 

    try {
        // Buscar la receta por ID y verificar que pertenezca al usuario autenticado
        const recipe = await Recipe.findOne({ where: { id: recipeId, userId } });

        if (!recipe) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta receta o no existe.' });
        }

        // Eliminar 
        await recipe.destroy();

        return res.json({ message: 'Receta eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar la receta:', error);
        return res.status(500).json({ error: 'Hubo un error al intentar eliminar la receta.' });
    }
};
