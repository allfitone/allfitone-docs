# Allfit One Documentation

Repositorio central de la documentación técnica transversal y de la definición detallada de los productos que componen Allfit One.

Aquí viven las especificaciones de producto, historias de usuario, decisiones de arquitectura, contratos y modelos compartidos por el ecosistema. El monorepo de implementación conserva la documentación necesaria para desarrollar, operar y mantener su código.

## Productos

| Producto | Documentación |
| --- | --- |
| Allfit Studio | [Especificación e historias de usuario](products/studio/README.md) |
| Allfit Space | [Especificación e historias de usuario](products/space/README.md) |
| Allfit Backoffice | [Especificación e historias de usuario](products/backoffice/README.md) |

La estructura admite nuevos productos mediante un directorio adicional en `products/<slug>/`.

## Plataforma compartida

- [Datos y base de datos](platform/database/README.md)
- [Refactor de base de datos](platform/database/refactor/README.md)
- [Decisiones de arquitectura](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)
- [Diseño propuesto](platform/database/refactor/03_PROPOSED_DESIGN/)
- [Plan de ejecución](platform/database/refactor/04_EXECUTION/)

## Topología de repositorios

- [`dinnartec/allfitone`](https://github.com/dinnartec/allfitone) es el monorepo de implementación de la plataforma. Contiene API, worker, Studio, Space, Backoffice y los paquetes compartidos de autenticación, cola, contratos y base de datos.
- `allfitone-docs` es la fuente normativa de producto, arquitectura y contratos transversales.
- `allfitone-design-system` permanece como biblioteca UI publicada y `allfitone-landing-page` como sitio público de marketing.

La decisión completa, incluidos los límites entre aplicaciones y deployables, está en [ADR-029](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md#adr-029-monorepo-de-implementación-con-deployables-independientes).

## Frontera documental

| `allfitone-docs` | Repositorios de código |
| --- | --- |
| Definición, alcance e historias de cada producto | README y navegación de cada aplicación o paquete |
| Arquitectura y decisiones que afectan a más de un producto | Instalación, desarrollo, pruebas y despliegue |
| Contratos compartidos de API, datos, identidad y seguridad | Arquitectura y decisiones internas de la implementación |
| Iniciativas técnicas transversales y su trazabilidad | Changelog, contribución, operación y mantenimiento local |

- El monorepo `allfitone`, `allfitone-design-system` y `allfitone-landing-page` mantienen la documentación local que necesitan.
- Una fuente de verdad no se copia entre repositorios: se conserva en su propietario y los demás documentos la enlazan.
- Si una decisión inicialmente local pasa a afectar a varios productos, su definición normativa se traslada a este repositorio y la documentación local conserva el enlace y el detalle de implementación.

## Validación

```bash
npm ci
npm run check
```

La validación comprueba la estructura básica de Markdown, los enlaces y anchors internos, y el contrato OpenAPI 3.1.

Las reglas para decidir dónde vive cada documento y cómo mantener sus fuentes de verdad están en [CONTRIBUTING.md](CONTRIBUTING.md).
