const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function commandAvailable(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 2000
  });

  if (result.error && result.error.code === 'ENOENT') {
    return { available: false, output: '' };
  }

  return {
    available: true,
    output: (result.stdout || result.stderr || '').trim()
  };
}

// 📦 Valida si el proceso podria instalar paquetes en runtime.
// Es importante porque una imagen que permite instalar herramientas tras el arranque
// amplía mucho la superficie de ataque y facilita el movimiento lateral,
// es decir, que un atacante use este contenedor como punto de apoyo para saltar
// a otros servicios, contenedores o recursos accesibles desde la red interna.
function canInstallPackages(user, packageManagers) {
  if (user.uid !== 0) {
    return false;
  }

  return packageManagers.apk_available || packageManagers.apt_available;
}

// ✍️ Valida si el proceso puede escribir en rutas sensibles del sistema.
// Es importante porque poder modificar /etc o /usr suele indicar un contenedor menos
// restringido y con más opciones de persistencia o manipulación tras un compromiso.
function canWriteTo(directory) {
  const probe = path.join(directory, `.write-test-${process.pid}`);

  try {
    fs.writeFileSync(probe, 'test');
    fs.rmSync(probe);
    return true;
  } catch {
    return false;
  }
}

// 👤 Valida con qué usuario real corre la app dentro del contenedor.
// Es importante porque ejecutar como root aumenta el impacto de cualquier RCE
// (Remote Code Execution, es decir, que un atacante consiga ejecutar código remoto
// dentro de la aplicación). Un usuario non-root limita bastante el alcance de ese proceso comprometido.
function getUser() {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const gid = typeof process.getgid === 'function' ? process.getgid() : null;

  try {
    const info = os.userInfo();
    return {
      name: info.username,
      uid,
      gid,
      is_root: uid === 0
    };
  } catch {
    return {
      name: process.env.USER || 'unknown',
      uid,
      gid,
      is_root: uid === 0
    };
  }
}

// 🔎 Reúne todas las validaciones de runtime que alimentan la demo.
// Cada comprobación intenta responder a una pregunta concreta de hardening:
// quién ejecuta el proceso, qué herramientas hay disponibles y cuánto puede tocar el sistema.
function buildStatusReport(port) {
  // 🐚 Valida si existe una shell POSIX utilizable.
  // Es importante porque disponer de sh facilita la exploración y explotación manual dentro del contenedor.
  const sh = commandAvailable('sh', ['-c', 'echo ok']);

  // 🧰 Valida si existe bash además de sh.
  // Es importante porque bash suele ofrecer un entorno aún más cómodo para post-explotación.
  const bash = commandAvailable('bash', ['-c', 'echo ok']);

  // 📦 Valida si apk está presente en runtime.
  // Es importante porque indica si una imagen Alpine permite instalar paquetes tras el arranque.
  const apk = commandAvailable('apk');

  // 📦 Valida si apt está presente en runtime.
  // Es importante por el mismo motivo: muestra si la imagen conserva un gestor de paquetes utilizable.
  const apt = commandAvailable('apt');

  // 👤 Obtiene el usuario efectivo del proceso para clasificar root vs non-root.
  const user = getUser();

  // 🗂️ Resume qué gestores de paquetes existen para reutilizar el dato en varias validaciones.
  const packageManagers = {
    apk_available: apk.available,
    apt_available: apt.available
  };

  return {
    timestamp: new Date().toISOString(),
    user,
    port: {
      // 🌐 Valida qué puerto está usando el servidor HTTP.
      // Es importante porque escuchar en un puerto no privilegiado suele ser consecuencia de no correr como root.
      listening: port
    },
    package_manager: {
      ...packageManagers,
      // 🚫 Valida si el contenedor combina privilegios y gestor de paquetes en runtime.
      // Esa combinación es especialmente relevante porque permite instalar utilidades una vez comprometido.
      can_install: canInstallPackages(user, packageManagers),
      apk_version: apk.output
    },
    shell: {
      // 🐚 Resultado de disponibilidad real de sh dentro del contenedor.
      sh_available: sh.available,

      // 🧰 Resultado de disponibilidad real de bash dentro del contenedor.
      bash_available: bash.available
    },
    filesystem: {
      // 🔒 Valida si /etc está protegido frente a escritura.
      can_write_etc: canWriteTo('/etc'),

      // 🔒 Valida si /usr está protegido frente a escritura.
      can_write_usr: canWriteTo('/usr')
    }
  };
}

module.exports = {
  buildStatusReport
};