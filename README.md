# 🎂 GastosCumpleApp

Web App para gestionar y dividir los gastos de un cumpleaños compartido entre 4 personas agrupadas en 2 núcleos familiares.

**Stack:** HTML5 · CSS3 · Vanilla JS (ES Modules) · Supabase · GitHub Pages

---

## 📦 Paso 1 — Configurar la Base de Datos en Supabase

### 1.1 Ejecutar el SQL

1. Ingresá a [supabase.com](https://supabase.com) y abrí tu proyecto.
2. En el menú lateral izquierdo, hacé clic en **SQL Editor**.
3. Creá una nueva query y pegá el siguiente script:

```sql
-- Crear la tabla de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario text   NOT NULL CHECK (usuario IN ('Edu', 'Ale', 'Adri', 'Andy')),
  detalle text   NOT NULL,
  monto   numeric(10,2) NOT NULL CHECK (monto > 0),
  fecha   timestamptz DEFAULT now()
);

-- Desactivar Row Level Security (app privada, sin login)
ALTER TABLE gastos DISABLE ROW LEVEL SECURITY;
```

4. Hacé clic en **Run** (▶️). Deberías ver el mensaje `Success. No rows returned.`

### 1.2 Verificar la tabla

En el menú lateral, hacé clic en **Table Editor** → debería aparecer la tabla `gastos` con las columnas: `id`, `usuario`, `detalle`, `monto`, `fecha`.

---

## 🚀 Paso 2 — Subir el Proyecto a GitHub

### 2.1 Crear el repositorio

1. Abrí [github.com/new](https://github.com/new).
2. Nombre del repositorio: `gastoscumpleapp`
3. Visibility: **Public** (requerido para GitHub Pages gratuito).
4. **No** marques "Add a README file" (ya tenemos uno).
5. Hacé clic en **Create repository**.

### 2.2 Subir los archivos

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
cd /ruta/a/gastoscumpleapp

git init
git add .
git commit -m "feat: primera versión de GastosCumpleApp"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gastoscumpleapp.git
git push -u origin main
```

> ⚠️ Reemplazá `TU_USUARIO` con tu nombre de usuario de GitHub.

---

## 🌐 Paso 3 — Activar GitHub Pages

1. En tu repositorio de GitHub, hacé clic en **Settings** (⚙️).
2. En el menú lateral, hacé clic en **Pages**.
3. En la sección **"Build and deployment"**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` · **/ (root)**
4. Hacé clic en **Save**.
5. Esperá 1–2 minutos y recargá la página. Aparecerá el link:

```
https://TU_USUARIO.github.io/gastoscumpleapp/
```

---

## 🔧 Estructura del Proyecto

```
gastoscumpleapp/
├── index.html    → Estructura principal de la SPA
├── style.css     → Estilos (dark mode + glassmorphism)
├── app.js        → Lógica JS + conexión Supabase
└── README.md     → Este archivo
```

---

## 👥 Lógica de Núcleos Familiares

| Núcleo   | Integrantes |
|----------|-------------|
| Núcleo 1 | Ale + Edu   |
| Núcleo 2 | Adri + Andy |

**Fórmulas:**
- `Cuota por núcleo = Total general ÷ 2`
- `Saldo = Total pagado por el núcleo − Cuota`
- 🟢 `Saldo > 0` → Saldo a favor (le deben)
- 🔴 `Saldo < 0` → Debe aportar
- ✅ `Saldo = 0` → Al día

---

## ⚡ Funcionalidades

- **Dashboard en tiempo real** con saldos calculados automáticamente
- **Formulario** para registrar gastos por persona
- **Historial** cronológico con badges de color por usuario
- **Realtime:** la tabla se actualiza automáticamente si alguien carga un gasto desde otro dispositivo
- **Responsive:** diseñado mobile-first, funciona en celular y desktop
