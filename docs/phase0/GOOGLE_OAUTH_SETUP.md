# Guía para el propietario: credenciales de Google (OAuth 2.0)

Esto lo hace usted una sola vez en la consola de Google. El agente no necesita ver el secreto; solo le dirá en qué variable colocarlo. Los nombres de los menús de Google cambian con frecuencia: si algo no coincide, busque el equivalente en la documentación oficial de Google Cloud.

## 1. Crear el proyecto y la pantalla de consentimiento
1. Entre a **Google Cloud Console** con la cuenta que administrará Pastel y cree un proyecto (por ejemplo, "Pastel").
2. Vaya a **APIs y servicios → Pantalla de consentimiento de OAuth** (o "Google Auth Platform").
3. Tipo de usuario: **Externo**. Nombre de la aplicación: "Pastel". Correo de asistencia y de contacto: el suyo.
4. **Ámbitos:** solo los básicos `openid`, `email` y `profile`. No agregue ámbitos sensibles.
5. Mientras el estado sea **"En pruebas"**, solo pueden ingresar las cuentas que agregue como *usuarios de prueba* (máximo 100). Para que cualquier persona pueda registrarse, cambie el estado a **"En producción"**; con ámbitos básicos no debería requerir verificación, pero confírmelo en la consola.

## 2. Crear el ID de cliente
1. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
2. **Orígenes autorizados de JavaScript:** no se necesitan (el flujo lo maneja el servidor).
3. **URI de redireccionamiento autorizados** (deben coincidir carácter por carácter):
   - Desarrollo local: `http://localhost:8080/api/auth/google/callback`
   - Más adelante, producción: `https://SU-DOMINIO/api/auth/google/callback`
4. Copie el **ID de cliente** y el **secreto**.

## 3. Guardarlos (nunca en el repositorio)
- Con Docker Compose: ponga en su archivo `.env` (que no se sube a Git):
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  APP_PUBLIC_BASE_URL=http://localhost:8080
  ```
- Con `dotnet run` directo: `dotnet user-secrets set "Authentication:Google:ClientId" "..."` y lo mismo con `ClientSecret`.

## 4. Probar
1. `docker compose up --build`, abra `http://localhost:8080` en Chrome, Edge o Firefox.
2. Pulse **Continuar con Google**, elija su cuenta y confirme que vuelve a Pastel con sesión iniciada.
3. Si Google muestra `redirect_uri_mismatch`, la URI registrada no coincide exactamente (puerto, `http`/`https`, barra final). Corrija en la consola o en `APP_PUBLIC_BASE_URL`.

## 5. Notas
- Use un cliente distinto para producción, con su propia URI.
- Si el secreto se expone, genere uno nuevo en la consola y reemplácelo.
- El primer administrador sigue entrando con el usuario de arranque (`BOOTSTRAP_ADMIN_*`). Para que su cuenta de Google sea administradora, use ese mismo correo en `BOOTSTRAP_ADMIN_EMAIL`: al ingresar con Google se vincula a la cuenta existente.
