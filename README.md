# AccscontrolFront

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.0.

## Development server

Run `npm start` for a dev server at `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Acceso público con Forward a Port

1. En `accscontrol_back`, inicia Nest con `npm run start:dev` y conserva tu `.env`
   habitual. El puerto esperado es `3000`.
2. En `accscontrol_front`, ejecuta `npm start`.
3. En la pestaña **Ports** de VS Code, usa **Forward a Port** para el puerto `4200`.
   Cambia **Port Visibility** a **Public** y comparte la dirección HTTPS generada.
4. Mantén ambos procesos y el túnel activos. No hace falta reenviar el puerto `3000`.

El navegador consulta `/api/` en el mismo dominio de Angular. `proxy.conf.cjs`
redirige esas peticiones a `http://127.0.0.1:3000`, quitando el prefijo `/api`.
También reenvía `/uploads/` para las imágenes. Se conservan las cabeceras de
autenticación, la tienda activa y las cargas multipart de imágenes.
No necesitas cambiar `APP_URL` ni abrir CORS a todos los orígenes: el acceso del
navegador es al mismo origen. La aplicación sigue solicitando el login habitual.

Si Nest usa otro puerto o se ejecuta en otro equipo, configura el destino antes
de iniciar Angular (PowerShell):

```powershell
$env:BACKEND_URL = 'http://127.0.0.1:3001'
npm start
```

Reinicia Angular después de modificar el proxy. Los hosts `*.devtunnels.ms` y
`*.app.github.dev` están permitidos; para otro proveedor, añade su host a
`serve.options.allowedHosts` en `angular.json`.

Esta configuración corresponde a `ng serve`. Un despliegue compilado debe
configurar también `/api/` y `/uploads/` en su proxy inverso; el proxy del CLI no
se incorpora a `ng build`.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
