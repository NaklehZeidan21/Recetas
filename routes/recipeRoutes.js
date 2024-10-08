// routes/recipeRoutes.js
import express from 'express';
import { generateAndSaveRecipe, getUserRecipes, deleteRecipe, shareRecipe, getSharedRecipe} from '../controllers/recipeController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

//api
router.post('/generate-recipe', authMiddleware, generateAndSaveRecipe); // ruta - middlerate y controller se llama a la logica del controlador 

//api
router.get('/my-recipes', authMiddleware, getUserRecipes);

// Ruta para renderizar el dashboard en /my-recipes
router.get('/my-recipes', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html')); 
});

//api
router.delete('/recipes/:recipeId', authMiddleware, deleteRecipe);


// Ruta para compartir una receta
router.post('/share/:recipeId', authMiddleware, shareRecipe);


// Ruta para acceder a una receta compartida
router.get('/shared/:shareId', getSharedRecipe);



export default router;
