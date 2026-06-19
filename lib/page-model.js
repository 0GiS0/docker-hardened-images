const { getFlavorContent } = require('./flavor-content');

// 📋 Convierte el estado técnico en checks legibles para la UI.
// Es importante porque la demo no solo detecta capacidades, también las traduce a señales de riesgo comprensibles.
function buildChecks(status) {
  return [
    {
      label: 'Usuario',
      value: `${status.user.name} (uid=${status.user.uid})`,
      secure: !status.user.is_root,
      detail: status.user.is_root ? 'Ejecutando como root' : 'Non-root'
    },
    {
      label: 'Puerto de escucha',
      value: status.port.listening,
      secure: status.port.listening > 1024,
      detail: status.port.listening > 1024 ? 'Puerto no privilegiado' : 'Puerto privilegiado (< 1024)'
    },
    {
      label: 'Package manager (apk)',
      value: status.package_manager.apk_available ? 'Disponible' : 'No disponible',
      secure: !status.package_manager.apk_available,
      detail: status.package_manager.apk_available ? 'Se pueden instalar paquetes' : 'No se pueden instalar paquetes'
    },
    {
      label: 'Puede instalar paquetes',
      value: status.package_manager.can_install ? 'Si' : 'No',
      secure: !status.package_manager.can_install,
      detail: status.package_manager.can_install ? 'Instalacion de paquetes posible' : 'Instalacion bloqueada'
    },
    {
      label: 'Shell (sh)',
      value: status.shell.sh_available ? 'Disponible' : 'No disponible',
      secure: !status.shell.sh_available,
      detail: status.shell.sh_available ? 'Shell accesible' : 'Sin shell'
    },
    {
      label: 'Bash',
      value: status.shell.bash_available ? 'Disponible' : 'No disponible',
      secure: !status.shell.bash_available,
      detail: status.shell.bash_available ? 'Bash disponible' : 'Sin bash'
    },
    {
      label: 'Escritura en /etc',
      value: status.filesystem.can_write_etc ? 'Si' : 'No',
      secure: !status.filesystem.can_write_etc,
      detail: status.filesystem.can_write_etc ? 'Puede modificar /etc' : '/etc protegido'
    },
    {
      label: 'Escritura en /usr',
      value: status.filesystem.can_write_usr ? 'Si' : 'No',
      secure: !status.filesystem.can_write_usr,
      detail: status.filesystem.can_write_usr ? 'Puede modificar /usr' : '/usr protegido'
    }
  ];
}

// 🖼️ Prepara el modelo completo de la vista EJS.
// Es importante porque une la variante declarada por la imagen con la evidencia real detectada en runtime.
function buildPageModel({ imageFlavor, status }) {
  const checks = buildChecks(status);
  const secureCount = checks.filter((check) => check.secure).length;

  return {
    flavorKey: imageFlavor,
    flavor: getFlavorContent(imageFlavor),
    status,
    checks,
    secureCount,
    totalCount: checks.length
  };
}

module.exports = {
  buildPageModel
};