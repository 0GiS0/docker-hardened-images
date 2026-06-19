# Docker Hardened Images

¡Hola developer 👋🏻! En este repo encontrarás una web estática que muestra las ventajas de usar [Docker Hardened Images](https://docs.docker.com/dhi/how-to/use/). La propia app sirve como ejemplo: la misma web se puede servir con una imagen regular o con una imagen hardened para que compruebes las diferencias.

## Requisitos previos

```shell
docker login dhi.io
```

## La app

Una web estática en `app/` que documenta las ventajas de las DHI. La misma web, dos formas de servirla:

| Archivo | Imagen base | Puerto | Tamaño | Seguridad |
|---------|-------------|--------|--------|-----------|
| `Dockerfile.regular` | `nginx:1-alpine3.22` | 80 | ~23.1 MB | 84 vulnerabilidades (3C 28H 44M 9L) |
| `Dockerfile.hardened` | `dhi.io/nginx:1-alpine3.22` | 8080 | ~4.8 MB | 1 vulnerabilidad (1M) |

---

## Demo 1: Construir y comparar

### Imagen regular

```shell
docker build -f Dockerfile.regular -t web-regular .
docker run --name web-regular -p 8080:80 -d web-regular
```

Abre http://localhost:8080 — la web funciona.

### Imagen hardened

```shell
docker build -f Dockerfile.hardened -t web-hardened .
docker run --name web-hardened -p 8081:8080 -d web-hardened
```

Abre http://localhost:8081 — la misma web, servida de forma segura.

### Comparar tamaño

```shell
docker images | grep web-
```

Verás la diferencia de tamaño: la imagen hardened es un **79% más pequeña** (4.8 MB vs 23.1 MB) y tiene un **81% menos de paquetes** (16 vs 86).

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
whoami          # root
apk add curl   # funciona
curl localhost  # funciona
exit
```

Un atacante que comprometa este contenedor puede instalar herramientas, escanear la red y escalar privilegios.

### En la imagen hardened: acceso restringido

```shell
docker exec -it web-hardened sh
```

> ℹ️ En nginx la shell está disponible porque el entrypoint de nginx usa scripts shell para configuración dinámica (envsubst). Sin embargo, el package manager **no existe**:

```shell
whoami          # nginx (non-root)
apk add curl   # sh: apk: not found
```

Un atacante que comprometa este contenedor no puede instalar nada, no es root y tiene capacidades muy limitadas.

### Contraste con Python: sin shell por completo

Para imágenes que no necesitan shell en su entrypoint (Python, Node, Go), la versión hardened lo elimina completamente:

```shell
# La imagen regular tiene shell
docker run --rm -it python:3.13-alpine sh
# funciona

# La imagen hardened NO tiene shell
docker run --rm -it dhi.io/python:3.13-alpine3.22 sh
# exec: "sh": executable file not found in $PATH
```

**Regla general:** las DHI incluyen el mínimo necesario para que la aplicación funcione. Nginx necesita shell → lo mantiene. Python runtime no necesita shell → lo elimina.

---

## Demo 3: Non-root por defecto

```shell
# Regular: root
docker exec web-regular id
# uid=0(root) gid=0(root)

# Hardened: non-root
docker exec web-hardened id
# uid=65532(nginx) gid=65532(nginx)
```

Por eso la imagen hardened usa el puerto 8080 y no el 80: los usuarios non-root no pueden hacer bind a puertos privilegiados (< 1024).

---

## Demo 4: Attestations con ORAS

Las DHI incluyen attestations firmadas. Puedes verificarlas:

```shell
brew install oras  # si no lo tienes
oras login dhi.io
oras discover dhi.io/nginx:1-alpine3.22 --platform linux/amd64
```

Verás:
- **SBOM** — qué contiene la imagen
- **Provenance** — cómo se construyó
- **Vulnerability report** — análisis de seguridad
- **Changelog** — cambios respecto a la versión anterior

---

## Limpieza

```shell
docker rm -f web-regular web-hardened
docker rmi web-regular web-hardened
```

---

## Resumen de diferencias

| Característica | `Dockerfile.regular` | `Dockerfile.hardened` |
|---|---|---|
| Tamaño | 23.1 MB | 4.8 MB |
| Paquetes | 86 | 16 |
| Vulnerabilidades | 84 (3C 28H 44M 9L) | 1 (1M) |
| Usuario | root (uid=0) | nginx (uid=65532) |
| Puerto | 80 | 8080 |
| Package manager | ✅ apk | ❌ |
| Shell | ✅ sh | ✅ (excepción nginx) |
| Attestations | ❌ | ✅ |