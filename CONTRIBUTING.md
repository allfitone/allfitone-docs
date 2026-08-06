# Contribuir a Allfit One Documentation

Este repositorio mantiene las fuentes normativas transversales del ecosistema y la definición detallada de sus productos. El monorepo de plataforma y los demás repositorios de código mantienen su documentación local según la [frontera documental](README.md#frontera-documental).

## Dónde debe vivir un documento

Un documento pertenece a `allfitone-docs` cuando cumple al menos una de estas condiciones:

- define alcance, reglas o historias de un producto;
- afecta a más de un producto, aplicación, paquete o repositorio;
- establece los requisitos, la semántica o la trazabilidad de un contrato compartido de API, datos, identidad, seguridad o integración;
- registra una decisión o iniciativa técnica transversal;
- sirve como fuente de trazabilidad entre producto y plataforma.

Un documento pertenece al repositorio de implementación cuando describe:

- instalación, desarrollo o ejecución local;
- estructura y decisiones internas del código;
- pruebas, despliegue, observabilidad u operación del repositorio;
- contribución, releases o changelog;
- uso específico de una librería, aplicación o componente.

Cuando un documento consume una fuente normativa de este repositorio debe enlazarla, no copiarla. Si una decisión deja de ser local y comienza a afectar a varios productos, su definición normativa se traslada aquí y el repositorio de implementación conserva únicamente el enlace y sus consecuencias locales.

Los artefactos ejecutables pertenecen al código que los consume. En particular, la fuente canónica OpenAPI vive en `allfitone/packages/contracts/openapi`; este repositorio documenta requisitos y trazabilidad, enlaza la especificación y no conserva una copia del YAML.

Las rutas estables de producto se definen en `paths`. Las rutas operacionales o provisionales que todavía no constituyen contrato para clientes deben figurar en `x-allfit-contract-gate.exclusions`; la justificación normativa se documenta aquí, pero la lista ejecutable se mantiene únicamente junto al OpenAPI.

## Organización

- `products/<slug>/`: definición, alcance e historias de cada producto.
- `platform/`: arquitectura y contratos compartidos por el ecosistema.
- `platform/database/refactor/`: iniciativa vigente de reconstrucción de la base de datos y sus fuentes normativas mientras dure el refactor.

Una nueva categoría transversal debe tener una responsabilidad clara antes de crear otro directorio. No se crean documentos separados para registrar conversaciones cuando ya existe una fuente normativa para el tema.

## Cambios normativos

Todo cambio de alcance, arquitectura o contrato debe:

1. modificar primero su fuente normativa;
2. actualizar los documentos derivados afectados;
3. conservar la trazabilidad hacia HU, ADR, operación o contrato correspondiente;
4. distinguir claramente entre estado aprobado, propuesta y referencia histórica;
5. evitar enlaces a artefactos futuros como si ya existieran.

Los documentos históricos no se reescriben para aparentar vigencia. Deben declarar qué decisión o documento vigente los supersede.

## Convenciones

- Los nombres técnicos y de archivo se escriben en inglés.
- Los documentos normativos usan `UPPER_SNAKE_CASE.md`; `README.md` y `CONTRIBUTING.md` conservan sus nombres convencionales.
- Cada documento tiene un único encabezado H1 y no omite niveles de encabezado.
- Las referencias internas utilizan enlaces relativos.
- Los enlaces externos usados como evidencia deben apuntar, cuando sea posible, a una versión o commit inmutable.
- La terminología de dominio debe coincidir con el glosario y las decisiones vigentes.

## Validación local

```bash
npm ci
npm run check
```

El comando valida Markdown, rutas y anchors internos. La estructura del contrato OpenAPI se valida en `allfitone` durante la HU que modifica la superficie afectada; los errores impiden integrar el cambio.

## Revisión

Antes de integrar un cambio se comprueba que:

- el documento está en el propietario correcto;
- no crea una segunda fuente de verdad;
- los documentos derivados permanecen sincronizados;
- los estados y fechas no presentan una propuesta como aprobada;
- `npm run check` finaliza correctamente.
