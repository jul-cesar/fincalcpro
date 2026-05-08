# FinCalcPro

Plataforma web profesional para simulacion y analisis financiero en ingenieria economica.

## Stack

- Vite + React + TypeScript.
- Tailwind CSS para el sistema visual.
- Chart.js y React Chart.js 2 para graficas.
- D3/SVG para diagramas financieros personalizados.
- TanStack Table para tablas.
- decimal.js para precision decimal.
- Zod para validacion.
- Vitest para pruebas del motor financiero.

## Modulos incluidos

- Panel principal del proyecto.
- Interés simple con procedimiento paso a paso.
- Interés compuesto con procedimiento paso a paso.
- Conversión de tasas efectivas equivalentes.
- Anualidades y función Pago para hallar depósitos periódicos.
- Tabla de amortización francesa, alemana y americana.
- Evaluación de alternativas con VPN, TIR aproximada y sensibilidad.
- Generación visual de flujo de caja con tabla de valor presente.
- Exportación CSV por módulo.
- Guardado de escenarios en el navegador.
- Validaciones de entrada.
- Tutorial guiado interactivo por secciones.
- Chat financiero con IA mediante backend local seguro.

## Uso

Instala dependencias y ejecuta el servidor de desarrollo:

```bash
npm install
npm run dev
```

## Configuracion de IA

La clave API nunca va en el frontend. Crea un archivo `.env.local` con Gemini:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_clave_gemini
GEMINI_MODEL=gemini-2.5-flash
```

Tambien puedes usar OpenAI como alternativa:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=tu_clave_openai
OPENAI_MODEL=gpt-5.2
```

Si dejas `AI_PROVIDER=auto`, FinCalcPro usa Gemini si existe `GEMINI_API_KEY`; si no, usa OpenAI si existe `OPENAI_API_KEY`. Si no configuras ninguna clave, el chat usa el agente financiero local como respaldo.

Build de produccion:

```bash
npm run build
```

Pruebas:

```bash
npm test
```


