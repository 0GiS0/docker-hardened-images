# Docker Hardened Images

En este repo encontrarás una pequeña app Node.js que muestra las ventajas de usar [Docker Hardened Images](https://docs.docker.com/dhi/how-to/use/). La propia app sirve como ejemplo: el mismo servidor se puede ejecutar con una imagen regular o con una imagen hardened para comprobar las diferencias en runtime.

## Requisitos previos

```shell
docker login dhi.io
```

## La app

Una app Node.js mínima sirve la web de `app/` y expone un informe de seguridad en `/status.json`. La misma app, dos formas de ejecutarla:

| Archivo | Imagen base | Puerto | Tamaño | Seguridad |
|---------|-------------|--------|--------|-----------|
| `Dockerfile.regular` | `node:24-alpine3.22` | 3000 | Runtime Node regular | Shell, package manager y usuario root |
| `Dockerfile.hardened` | `dhi.io/node:24-dev` → `dhi.io/node:24` | 8080 | Multi-stage hardened | Non-root, sin shell ni package manager en runtime |

---

## Demo 1: Construir y comparar

### Imagen regular

```shell
docker build -f Dockerfile.regular -t web-regular .
docker run --name web-regular -p 3000:3000 -d web-regular
```

Abre http://localhost:3000 — la web funciona.

### Imagen hardened

```shell
docker build -f Dockerfile.hardened -t web-hardened .
docker run --name web-hardened -p 8081:8080 -d web-hardened
```

Abre http://localhost:8081 — la misma web, servida de forma segura.

### Comparar tamaño y base usada

```shell
docker images | grep web-
```

Verás dos enfoques distintos: la regular usa una runtime Node completa y la hardened usa un patrón multi-stage con `-dev` para instalar dependencias y una runtime final mucho más restringida.

### Comparar vulnerabilidades con Docker Scout

```shell
docker scout quickview web-regular
docker scout quickview web-hardened
```

![docker-scout-regular-nginx](./images/docker%20scout%20regular-nginx.png)

---

## Demo 2: Shell y package manager

### En la imagen regular: acceso total

```shell
docker exec -it web-regular sh
```

Dentro del contenedor:

```shell
whoami            # root
apk add curl      # funciona
curl localhost:3000  # funciona
exit
```

Un atacante que comprometa este contenedor puede instalar herramientas, escanear la red y escalar privilegios.

### En la imagen hardened: acceso restringido

```shell
docker exec -it web-hardened sh
```

En una runtime hardened de Node, la shell ya no está disponible:

```shell
exec: "sh": executable file not found in $PATH
```

Si inspeccionas el informe en vivo de la app, verás además que el proceso corre como non-root y que `apk` no existe en runtime.

### Contraste directo con Node

La gracia de pasar esta demo a Node es que el ejemplo ya usa una imagen hardened que no necesita shell en su runtime:

```shell
# La imagen regular tiene shell
docker run --rm -it node:24-alpine3.22 sh
# funciona

# La imagen hardened NO tiene shell
docker run --rm -it dhi.io/node:24 sh
# exec: "sh": executable file not found in $PATH
```

**Regla general:** las DHI incluyen el mínimo necesario para que la aplicación funcione. En Node runtime, la shell no es necesaria → se elimina.

---

## Demo 3: Non-root por defecto

```shell
# Regular: root
docker exec web-regular id
# uid=0(root) gid=0(root)

# Hardened: non-root
docker exec web-hardened id
# uid=1000(node) gid=1000(node)
```

Por eso la imagen hardened usa el puerto 8080 y no el 80: los usuarios non-root no pueden hacer bind a puertos privilegiados (< 1024).

---

## Demo 4: Attestations con ORAS

Las DHI incluyen attestations firmadas. Puedes verificarlas:

```shell
brew install oras  # si no lo tienes
oras login dhi.io
oras discover dhi.io/node:24 --platform linux/amd64
```

Verás:
- **SBOM** — qué contiene la imagen
- **Provenance** — cómo se construyó
- **Vulnerability report** — análisis de seguridad
- **Changelog** — cambios respecto a la versión anterior

---

## Demo 5: Multi-stage con `-dev`

La imagen hardened usa este patrón:

```dockerfile
FROM dhi.io/node:24-dev AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY app ./app
COPY server.js ./server.js

FROM dhi.io/node:24
WORKDIR /app
COPY --from=build /app /app
CMD ["node", "server.js"]
```

La fase `-dev` incluye lo necesario para `npm ci`. La runtime final solo recibe la app ya preparada.

## Demo 6: Socket Firewall

Ahora sí está implementada una variante específica:

```dockerfile
FROM dhi.io/node:24-sfw-dev AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY app ./app
COPY server.js ./server.js

FROM dhi.io/node:24
WORKDIR /app
COPY --from=build /app /app
CMD ["node", "server.js"]
```

Puedes construirla así:

```shell
docker build -f Dockerfile.hardened-sfw -t web-hardened-sfw .
docker run --name web-hardened-sfw -p 8082:8080 -d web-hardened-sfw
```

La runtime final sigue siendo `dhi.io/node:24`; la diferencia es que la fase de instalación usa Socket Firewall para vigilar la actividad del package manager.

## Demo 7: CI/CD y attestations

El repo incluye un workflow de ejemplo en `.github/workflows/dhi-ci.yml` que:

- hace login en `dhi.io`
- construye la imagen regular
- construye la imagen hardened multi-stage
- construye la variante con Socket Firewall
- ejecuta `oras discover dhi.io/node:24 --platform linux/amd64`

Antes de usarlo, define estos secrets en GitHub:

- `DHI_USERNAME` — tu Docker ID o el nombre de tu organización
- `DHI_TOKEN` — PAT u OAT con permisos de lectura

## Limpieza

```shell
docker rm -f web-regular web-hardened
docker rm -f web-hardened-sfw
docker rmi web-regular web-hardened web-hardened-sfw
```

---

## Resumen de diferencias

| Característica | `Dockerfile.regular` | `Dockerfile.hardened` |
|---|---|---|
| Usuario | root (uid=0) | node (uid=1000) |
| Puerto | 3000 | 8080 |
| Package manager | ✅ apk | ❌ |
| Shell | ✅ sh | ❌ |
| Multi-stage con `-dev` | No | ✅ |
| Variante `-sfw-dev` | No | ✅ |
| Attestations | ❌ | ✅ |