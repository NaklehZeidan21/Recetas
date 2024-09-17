# Recetas Generador de Texto

Este proyecto es una aplicación web para generar recetas usando un modelo de generación de texto de Hugging Face. Los usuarios pueden seleccionar varios ingredientes representados por emojis, y al hacer clic en "Generar Receta", se obtiene una receta basada en los ingredientes seleccionados.

![Captura de pantalla 2024-09-17 041333](https://github.com/user-attachments/assets/a5ba0774-0a85-49d6-be08-8b2bc22f4d8f)


## Características

- Interfaz minimalista y elegante.
- Selección de ingredientes usando emojis de comida.
- Generación de recetas utilizando el modelo `microsoft/Phi-3-mini-4k-instruct` de Hugging Face.
- Visualización de la receta de manera clara y bien estructurada.
- Carga y visualización de recetas con un indicador de carga.

## Instalación

1. Clona el repositorio:

    ```bash
    git clone https://github.com/NaklehZeidan21/Recetas.git
    ```

2. Navega al directorio del proyecto:

    ```bash
    cd Recetas
    ```

3. Instala las dependencias:

    ```bash
    npm install
    ```

## Uso

1. Crea un archivo `.env` en el directorio raíz del proyecto y agrega tu token de Hugging Face:

    ```plaintext
    HF_TOKEN=tu_token_aqui
    ```

2. Inicia el servidor:

    ```bash
    npm start
    ```

3. Abre tu navegador y ve a `http://localhost:3000` para usar la aplicación.

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o envía un pull request si encuentras algún error o deseas agregar nuevas funcionalidades.

