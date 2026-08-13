# Pipeline para importar preguntas desde imágenes

1. Guarda capturas temporalmente en `images/`.
2. Transcribe cada imagen a este formato intermedio:

```json
{
  "question": "Texto exacto de la pregunta",
  "options": ["A", "B", "C", "D"],
  "answer_text": "Texto exacto de la opción correcta si aparece",
  "explanation": "Explicación visible si aparece",
  "source": "images/nombre.png"
}
```

3. Convierte `answer_text` al índice de `options` empezando en 0.
4. Si la captura no muestra la respuesta, puedes completar la respuesta validándola contra documentación/guías AWS y marca:

```json
"answerSource": "inferred-from-aws-knowledge"
```

5. Agrega el objeto final al JSON del dominio:

```text
data/questions/aws/<codigo-examen>/domain-N.json
```

6. Actualiza `questionCount` y `dataUrl` en `data/catalog.json`.
7. Verifica en navegador que la respuesta correcta y la explicación se muestran bien.

## Plantilla JSON

```json
{
  "id": "aif-d1-qXXX",
  "domainId": "domain-1",
  "source": "images/archivo.png",
  "type": "single-choice",
  "question": "",
  "options": ["", "", "", ""],
  "answer": 0,
  "explanation": "",
  "tags": []
}
```

## Recomendación

Evita duplicados: antes de importar, busca si la pregunta ya existe por una frase corta del enunciado.
