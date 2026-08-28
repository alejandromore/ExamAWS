# Practice Trainer

Aplicación local escalable para practicar exámenes de certificación. Está organizada por **roadmaps**, **certificaciones**, **dominios** y **bancos de preguntas JSON**.

Actualmente cubre certificaciones de **AWS** (nube / IA) e **ISO** (gobernanza y auditoría de IA). El catálogo es multi-proveedor: cada roadmap y cada examen declaran su `vendor`.

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
    state.js
    app.js
    styles.css
    utils/           # helpers, markdown, tags
    views/           # homeView, roadmapView, setupView, quizView, resultsView
  data/
    catalog.json
    roadmaps/
      ai.json
      solutions-architect.json
      ai-governance.json
    questions/
      aws/
        aif-c01/
          domain-1.json ... domain-5.json
          practice-exam-1.json
      iso/
        42001-ia/
          domain-1.json ... domain-6.json
          sample-exam-1.json
  tools/
    import-template.md
  images/              # ignorada por Git
  .gitignore
```

## Menú inicial

La pantalla inicial permite elegir entre:

- **Roadmap de certificación de IA** (AWS)
  - AIF-C01 disponible: 5 dominios + simulador completo.
  - Estructura preparada para rutas futuras de Machine Learning.
- **Roadmap Solution Architect** (AWS)
  - CLF-C02, SAA-C03 y SAP-C02 preparados (sin banco de preguntas todavía).
- **Roadmap de Gobernanza y Auditoría de IA** (ISO)
  - I42001IA disponible: 6 módulos + examen de muestra oficial.
  - Estructura preparada para Lead Auditor e ISO/IEC 27001.

La navegación es jerárquica y con migas de pan en cada nivel:
`Menú inicial › Roadmap › Certificación › Resultados`.

## Preguntas cargadas

### AWS Certified AI Practitioner — AIF-C01 (337)

Cinco dominios (78 / 60 / 64 / 35 / 35) más `practice-exam-1.json` con 65 preguntas.

### ISO/IEC 42001 Internal Auditor — I42001IA (248)

Extraído del material del curso en `Documents/Cursos/ISO42001`. Los pesos por dominio
siguen la distribución del JTA declarada en el syllabus.

| Módulo | Contenido | Peso | Preguntas |
| --- | --- | ---: | ---: |
| 1 | Introducción y contexto del SGIA (Cláusulas 1–4) | 9% | 30 |
| 2 | Liderazgo y planificación (Cláusulas 5–6) | 16% | 32 |
| 3 | Soporte y operación (Cláusulas 7–8) | 15% | 33 |
| 4 | Evaluación del desempeño (Cláusula 9) | 26% | 38 |
| 5 | Auditoría interna del SGIA (ISO 19011 + 9.2) | 19% | 45 |
| 6 | Mejora y cierre del ciclo (Cláusula 10) | 15% | 30 |
| — | Examen de muestra oficial (simulador) | — | 40 |

El banco `sample-exam-1.json` reproduce las 40 preguntas del examen de muestra oficial
con su hoja de respuestas publicada. El resto de preguntas se redactó a partir del
material del curso, y cada una referencia su origen en el campo `source`.

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

2. Agrega preguntas con este formato (`answer` es un índice; para preguntas de
   selección múltiple usa `"type": "multiple-choice"` y un array de índices):

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
    "tags": ["tema", "servicio-aws", "difficulty:basic", "module:m01", "clause:9.2"]
  }
]
```

Las etiquetas con prefijo se renderizan como distintivos con formato propio:
`difficulty:` (básica / intermedia / avanzada), `module:`, `clause:`, y los nombres de
norma (`iso42001`, `iso19011`, `iso22989`, `iso23894`). El resto se muestra como
etiqueta general.

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

4. Si pertenece a un roadmap nuevo, crea `data/roadmaps/<roadmap>.json` y referencia ese
   roadmap desde `data/catalog.json`, indicando `vendor` e `icon`:

```json
{
  "id": "ai-governance",
  "title": "Roadmap de Gobernanza y Auditoría de IA",
  "description": "...",
  "vendor": "ISO",
  "icon": "📋",
  "url": "data/roadmaps/ai-governance.json"
}
```

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
