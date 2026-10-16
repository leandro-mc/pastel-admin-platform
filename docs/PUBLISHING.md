# Publicar y trabajar con el repositorio

El repositorio remoto es `https://github.com/leandro-mc/pastel-admin-platform`. Para clonar el proyecto en una computadora:

```powershell
git clone https://github.com/leandro-mc/pastel-admin-platform.git
cd pastel-admin-platform
```

Después de los cambios, trabajá en una rama enfocada y subila mediante la autenticación oficial de Git Credential Manager:

```powershell
git switch -c feat/nombre-del-cambio
# editar y probar
 git add .
git commit -m "feat: describir cambio"
git push -u origin feat/nombre-del-cambio
```

Abrí un Pull Request contra `main`. No incluyás `.env`, tokens, contraseñas reales ni datos personales. Nunca usés `git push --force` sobre `main`.

## Levantar el entorno local

Copiá `.env.example` a `.env`, cambiá las claves y contraseñas locales, y seguí el README. Los valores de `.env.example` son sólo para desarrollo local y no deben reutilizarse en despliegues accesibles desde la red.
