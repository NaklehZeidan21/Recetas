import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    const { email, password } = req.body;
    try {
        
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.log('El usuario ya existe:', email);
            return res.status(400).json({ error: 'El usuario ya existe.' });
        }

        
        const hashedPassword = await bcrypt.hash(password, 10);

        
        const newUser = await User.create({ email, password: hashedPassword });
        console.log('Usuario creado:', newUser);

        res.status(201).json({ message: 'Usuario creado exitosamente.' });
    } catch (error) {
        console.error('Error en el registro de usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario.', details: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('Usuario no encontrado:', email);
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Contraseña incorrecta para el usuario:', email);
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' }); 
        console.log('Token generado para el usuario:', email);

        res.json({ token });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ error: 'Error al iniciar sesión.', details: error.message });
    }
};
