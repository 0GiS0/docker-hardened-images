# Docker Hardened Images

¡Hola developer 👋🏻! En este repo encontrarás una serie de demos que demuestran por qué debes usar Docker Hardened Images a partir de ahora.

## Ejemplo con Nginx

Para que lo puedas ver de forma sencilla y con un ejemplo que es muy común vamos a usar una versión de la imagen de nginx. Vamos a descargarla de la misma forma que lo hemos hecho siempre. Esto es:

```shell
docker pull nginx:1-alpine3.21
```

Si echamos un vistazo a la misma:

```shell
docker images nginx
```

Te vas a dar cuenta que la misma ocupa 22.7MB, por lo que es una imagen relativamente pequeña por lo que de primeras todo bien.

Vamos a ejecutar un contenedor con la misma de la forma habitual:

```shell
docker run --name regular-nginx -p 8080:80 -d nginx:1-alpine3.21
```

Ahora vamos a intentar conectarnos al shell de este contenedor:

```shell
docker exec -it regular-nginx sh
``` 
y verás que puedes acceder sin problema.

Y ya por último vamos a ver qué nos dice `docker scout`de esta imagen:

```shell
docker scout quickview nginx:1-alpine3.21
```

y como puedes ver este es el resultado:

![docker-scout-regular-nginx](./images/docker%20scout%20regular-nginx.png)

### Resultados de `docker scout`

El `quickview` de Docker Scout para `nginx:1-alpine3.21` muestra las siguientes vulnerabilidades heredadas de la imagen base `oisupport/staging-arm64v8:606cf5cdc423682187a014d1d4e9c992d0655d58171c788b4ef54b299c233d07`:

- 2 vulnerabilidades **críticas**
- 9 vulnerabilidades de severidad **alta**
- 14 vulnerabilidades de severidad **media**
- 5 vulnerabilidades de severidad **baja**

> ℹ️ Estos números provienen del SBOM generado por Docker Scout para la imagen objetivo y son el punto de partida para endurecerla.

Con todo esto ahora vamos a ver cómo se comporta la versión hardened de esta imagen.

## Ejemplo con Nginx Hardened

Si queremos recuperar la versión hardened de esta imagen lo único que debemos hacer es poner por delante de la misma `dhi.io/`, por lo que el comando para descargarla sería el siguiente:

```shell
docker pull dhi.io/nginx:1-alpine3.21
```

Esto es así porque `dhi.io` es el repositorio público de Docker Hardened Images.

Si volvemos a echar un vistazo al listado de imagenes descargadas

```shell
docker images
```

Comprobarás que la imagen `dhi.io/nginx:1-alpine3.21` ocupa 4.61MB, lo que supone una reducción de tamaño del 79.7% respecto a la imagen original. Esto es importante porque cuanto más pequeña sea la imagen, menos superficie de ataque tendrá.

Ahora vamos a ejecutar un contenedor con esta imagen hardened:

```shell
docker run --name hardened-nginx -p 8081:80 -d dhi.io/nginx:1-alpine3.21 
```

Si intentamos exponer directamente el puerto 80 veremos que no funciona. En este caso, esta imagen tiene como puerto por defecto el 8080.

```shell
docker rm -f hardened-nginx
docker run --name hardened-nginx -p 8081:8080 -d dhi.io/nginx:1-alpine3.21 
```

Esto es así porque [una de las medidas de seguridad](https://docs.docker.com/dhi/how-to/use/#considerations-when-adopting-dhis) que implementan las Docker Hardened Images es no usar puertos privilegiados (por debajo del 1024).

"Applications running as non-root users can't bind to ports below 1024 in older versions of Docker or in some Kubernetes configurations. Use ports above 1024 for compatibility."

Ahora vamos a intentar conectarnos al shell de este contenedor:

```shell
docker exec -it hardened-nginx sh
```

Y ahora intentamos instalar el mismo paquete:

```shell
apk add vim
```

En este caso no funciona porque el gestor de paquetes no está disponible en esta imagen hardened. Esto es así porque [otra de las medidas de seguridad](https://docs.docker.com/dhi/how-to/use/#considerations-when-adopting-dhis) que implementan las Docker Hardened Images es eliminar los gestores de paquetes para evitar que se instalen paquetes no autorizados.

# Por defecto en estas imágenes no se ejecutan como root

A diferencia de las imágenes tradicionales, las Docker Hardened Images no se ejecutan como root por defecto. Esto es una medida de seguridad importante porque limita el alcance de un posible ataque. Por lo que si dentro de esta misma imagen ejecutamos el comando `id` veremos que el usuario no es root:

```shell
whoami
```

Verás que en este caso el usuario es `nginx` y no `root`.

# Multistage build

Para generar estas imagenes siempre se usa la técnica de multistage build para asegurarse de que solo los artefactos necesarios se incluyen en la imagen final. Esto ayuda a reducir el tamaño de la imagen y a minimizar la superficie de ataque.

# TLS certificates

DHIs include standard TLS certificates. You do not need to manually install CA certs. Esto significa que las aplicaciones dentro del contenedor pueden establecer conexiones seguras sin necesidad de configuraciones adicionales.

Para comprobarlo podemos ejecutar el siguiente comando dentro del contenedor:

```shell
wget https://www.google.com
```