# Allfit One Documentation

Repositorio central de la documentación técnica y de alcance utilizada para desarrollar Allfit One.

Aquí vive la documentación que anteriormente estaba distribuida entre `allfitone-os` y `allfitone-space`: especificaciones de producto, historias de usuario, decisiones de arquitectura, contratos y diseño de base de datos. Las especificaciones y HU se conservan porque son la fuente de alcance y trazabilidad de la implementación técnica.

## Productos

| Producto | Documentación |
| --- | --- |
| Allfit OS | [Especificación e historias de usuario](products/os/README.md) |
| Allfit Space | [Especificación e historias de usuario](products/space/README.md) |
| Allfit Backoffice | [Historias de usuario](products/backoffice/README.md) |

La estructura admite nuevos productos mediante un directorio adicional en `products/<slug>/`.

## Plataforma compartida

- [Datos y base de datos](platform/database/README.md)
- [Refactor de base de datos](platform/database/refactor/README.md)
- [Decisiones de arquitectura](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)
- [Diseño propuesto](platform/database/refactor/03_PROPOSED_DESIGN/)
- [Plan de ejecución](platform/database/refactor/04_EXECUTION/)

## Límites

- `allfitone-os`, `allfitone-space` y `allfitone-backoffice` no almacenan esta documentación.
- Los documentos propios de `allfitone-design-system` y `allfitone-landing-page` permanecen en esos repositorios.
- No se duplican README, PRODUCT, DESIGN, changelogs ni guías pertenecientes a otros repositorios.

## Validación

```bash
npm run check
```

La validación comprueba que todos los enlaces internos apunten a archivos o directorios existentes.
