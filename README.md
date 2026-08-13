# ExamAWS Practice Trainer

Aplicación local escalable para practicar certificaciones AWS. Ahora está organizada por **roadmaps**, **certificaciones**, **dominios** y **bancos de preguntas JSON**.

## Cómo abrirla

Como la app carga archivos `.json` con `fetch`, se recomienda usar servidor local:

```bat
cd C:\Projects\ExamAWS
python -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

> Si abres `index.html` directamente, algunos navegadores bloquean la carga de JSON local.

## Estructura escalable

```text
ExamAWS/
  index.html
  src/
    app.js
    styles.css
  data/
    catalog.json
    roadmaps/
      ai.json
      solutions-architect.json
    questions/
      aws/
        aif-c01/
          domain-1.json
          domain-2.json
  tools/
    import-template.md
  images/              # ignorada por Git
  .gitignore
```

## Menú inicial

La pantalla inicial permite elegir entre:

- **Roadmap de certificación de IA**
  - AIF-C01 disponible con Dominio 1 y Dominio 2.
  - Estructura preparada para rutas futuras de Machine Learning.
- **Roadmap Solution Architect**
  - CLF-C02 preparado.
  - SAA-C03 preparado.
  - SAP-C02 preparado.

## Preguntas cargadas

### AWS Certified AI Practitioner - AIF-C01

- Dominio 1: `data/questions/aws/aif-c01/domain-1.json`
  - 12 preguntas migradas desde el archivo JS anterior.
- Dominio 2: `data/questions/aws/aif-c01/domain-2.json`
  - 12 preguntas únicas transcritas desde las nuevas capturas en `images/`.
  - Algunas capturas eran duplicadas.

## Funcionalidades de entrenamiento

- Modo **Práctica**: feedback inmediato.
- Modo **Examen**: feedback al final y temporizador.
- Modo **Revisión**: prioriza preguntas falladas.
- Aleatorización de preguntas.
- Aleatorización de opciones.
- Seguimiento de progreso en `localStorage`.
- Resumen final con puntaje, errores y explicación.
- Atajos:
  - `1-4` para seleccionar respuesta.
  - `Enter` para comprobar o avanzar.

## Cómo agregar una nueva certificación

1. Crea una carpeta de preguntas:

```text
data/questions/aws/<codigo-examen>/
```

Ejemplo:

```text
data/questions/aws/saa-c03/domain-1.json
```

2. Agrega preguntas con este formato:

```json
[
  {
    "id": "saa-d1-q001",
    "domainId": "domain-1",
    "source": "manual",
    "type": "single-choice",
    "question": "Texto de la pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "answer": 0,
    "explanation": "Explicación de la respuesta correcta.",
    "tags": ["tema", "servicio-aws"]
  }
]
```

3. Actualiza `data/catalog.json`:

```json
{
  "id": "domain-1",
  "title": "Nombre del dominio",
  "weight": 30,
  "dataUrl": "data/questions/aws/saa-c03/domain-1.json",
  "questionCount": 1
}
```

4. Si pertenece a un roadmap nuevo, crea `data/roadmaps/<roadmap>.json` y referencia ese roadmap desde `data/catalog.json`.

## Git ignore

Se agregó `.gitignore` para excluir:

```text
images/
__pycache__/
*.pyc
```

Así las capturas usadas para transcripción no se suben al repositorio.

## Nota sobre respuestas del Dominio 2

Las capturas nuevas mostraban las preguntas y opciones, pero no siempre mostraban respuesta marcada ni explicación. Para que el entrenamiento quede usable, agregué respuestas y explicaciones con base en conocimiento de AWS. Están marcadas con:

```json
"answerSource": "inferred-from-aws-knowledge"
```
