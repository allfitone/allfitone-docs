# Allfit One Documentation

Repositorio central de la documentación técnica transversal y de la definición detallada de los productos que componen Allfit One.

Aquí viven las especificaciones de producto, historias de usuario, decisiones de arquitectura, contratos y modelos compartidos por el ecosistema. Cada repositorio de implementación conserva la documentación necesaria para desarrollar, operar y mantener su propio código.

## Productos

| Producto | Documentación |
| --- | --- |
| Allfit OS | [Especificación e historias de usuario](products/os/README.md) |
| Allfit Space | [Especificación e historias de usuario](products/space/README.md) |
| Allfit Backoffice | [Especificación e historias de usuario](products/backoffice/README.md) |

La estructura admite nuevos productos mediante un directorio adicional en `products/<slug>/`.

## Plataforma compartida

- [Datos y base de datos](platform/database/README.md)
- [Refactor de base de datos](platform/database/refactor/README.md)
- [Decisiones de arquitectura](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)
- [Diseño propuesto](platform/database/refactor/03_PROPOSED_DESIGN/)
- [Plan de ejecución](platform/database/refactor/04_EXECUTION/)

## Frontera documental

| `allfitone-docs` | Repositorios de implementación |
| --- | --- |
| Definición, alcance e historias de cada producto | README y navegación del repositorio |
| Arquitectura y decisiones que afectan a más de un producto | Instalación, desarrollo, pruebas y despliegue |
| Contratos compartidos de API, datos, identidad y seguridad | Arquitectura y decisiones internas de la implementación |
| Iniciativas técnicas transversales y su trazabilidad | Changelog, contribución, operación y mantenimiento local |

- `allfitone-os`, `allfitone-space`, `allfitone-backoffice`, `allfitone-design-system` y `allfitone-landing-page` mantienen la documentación propia que necesitan.
- Una fuente de verdad no se copia entre repositorios: se conserva en su propietario y los demás documentos la enlazan.
- Si una decisión inicialmente local pasa a afectar a varios productos, su definición normativa se traslada a este repositorio y la documentación local conserva el enlace y el detalle de implementación.

## Validación

```bash
npm ci
npm run check
```

La validación comprueba la estructura básica de Markdown, los enlaces y anchors internos, y el contrato OpenAPI 3.1.

Las reglas para decidir dónde vive cada documento y cómo mantener sus fuentes de verdad están en [CONTRIBUTING.md](CONTRIBUTING.md).
