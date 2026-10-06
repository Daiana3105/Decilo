# Catálogo inicial de pictogramas

El catálogo controlado vive en `app.js` y cada entrada exige:

- `id`: identificador estable usado por los tableros.
- `word`: texto asociado usado para construir y reproducir la frase.
- `alt`: descripción alternativa para controles accesibles.
- `license`: procedencia o licencia del elemento.
- `category`: categoría visible del tablero.

El MVP usa símbolos Unicode como representación visual local con licencia declarada `DECILO inicial`. No se publican recursos externos sin metadatos. La sustitución por una fuente pictográfica licenciada puede conservar este contrato sin cambiar el flujo.

El catálogo conserva los IDs existentes y agrega las categorías emociones,
necesidades, lugares, personas, acciones y objetos cotidianos. Los tableros
persisten sus IDs en orden; el editor permite filtrar, buscar, agregar, mover,
quitar y escuchar cada palabra. Mi comunicador permite filtrar, escuchar cada
pictograma y reordenar o quitar palabras de la frase transitoria.