const flavorContent = {
  regular: {
    title: 'Imagen regular',
    summary: 'Runtime Node completa con shell, package manager y usuario root.',
    accentClass: 'regular',
    highlights: [
      'Shell disponible para depuracion interactiva',
      'Package manager presente en runtime',
      'El proceso arranca como root',
      'Mas herramientas instaladas por defecto'
    ]
  },
  hardened: {
    title: 'Imagen hardened',
    summary: 'Runtime restringida con usuario non-root, sin shell y sin package manager.',
    accentClass: 'hardened',
    highlights: [
      'Build multi-stage con variante -dev',
      'Runtime final sin shell interactiva',
      'Sin apk ni apt disponibles',
      'Attestations firmadas para SBOM y provenance'
    ]
  },
  sfw: {
    title: 'Imagen hardened con Socket Firewall',
    summary: 'Misma runtime hardened, pero con la fase de instalacion vigilada por Socket Firewall.',
    accentClass: 'sfw',
    highlights: [
      'Build con variante -sfw-dev',
      'Supervision de npm ci durante el build',
      'Runtime final sin shell ni package manager',
      'Misma superficie minima que la imagen hardened'
    ]
  },
  unknown: {
    title: 'Imagen no identificada',
    summary: 'La app no recibio una etiqueta IMAGE_FLAVOR explicita.',
    accentClass: 'unknown',
    highlights: [
      'Falta IMAGE_FLAVOR en el contenedor',
      'La deteccion de capacidades sigue siendo real',
      'La presentacion no puede etiquetar la variante',
      'Usa regular, hardened o sfw para esta demo'
    ]
  }
};

function getFlavorContent(flavorKey) {
  return flavorContent[flavorKey] || flavorContent.unknown;
}

module.exports = {
  getFlavorContent
};