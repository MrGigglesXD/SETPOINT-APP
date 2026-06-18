# SETPOINT_MASTER_SPEC.md

> Documento maestro oficial del proyecto SETPOINT.

## 1. Visión

SETPOINT es un sistema para administrar jornadas recreativas de
voleibol.

No es únicamente un marcador. Debe permitir gestionar jugadores,
equipos, cola, partidos, estadísticas e historial de una jornada
completa.

------------------------------------------------------------------------

## 2. Objetivos

-   Reducir el uso de papel.
-   Automatizar la organización de partidos.
-   Mantener una experiencia rápida e intuitiva.
-   Funcionar sin conexión.
-   Ser escalable.

------------------------------------------------------------------------

## 3. Principios

1.  El usuario es primero.
2.  Nunca duplicar información.
3.  Un solo origen de la verdad.
4.  Código modular.
5.  Todo debe compilar siempre.
6.  UI simple.
7.  Arquitectura escalable.

------------------------------------------------------------------------

## 4. Arquitectura

### Frontend

-   React
-   TypeScript
-   Vite
-   Zustand
-   Tailwind

### Backend

-   Rust
-   Tauri
-   SQLite

------------------------------------------------------------------------

## 5. Módulos

-   Players
-   Queue
-   Match
-   Scoreboard
-   History
-   Statistics
-   Settings

Cada módulo debe ser independiente.

------------------------------------------------------------------------

## 6. Estados del jugador

Un jugador solamente puede estar en uno de estos estados:

-   Pool
-   Equipo Azul
-   Equipo Rojo
-   Cola
-   Jugando
-   Inactivo

Nunca puede pertenecer a dos estados al mismo tiempo.

------------------------------------------------------------------------

## 7. Flujo oficial

Jugadores

↓

Pool

↓

Equipos

↓

Marcador

↓

Resultado

↓

Rotación

↓

Cola

↓

Nuevo partido

------------------------------------------------------------------------

## 8. Equipos

Formatos:

-   4 vs 4
-   6 vs 6

Configuración:

-   Exhibición
-   Oficial

Balanceo automático utilizando el nivel (1-5 estrellas).

Siempre permitir ajustes manuales posteriores.

------------------------------------------------------------------------

## 9. Cola

La cola se genera automáticamente con los jugadores restantes.

Respeta el orden de llegada.

No se edita manualmente.

------------------------------------------------------------------------

## 10. Marcador

Configuraciones:

-   16
-   21
-   25 puntos

Sets:

-   1
-   3
-   5

Win by 2 siempre activo.

Sin límite de deuce.

Debe funcionar independientemente del módulo Partido.

------------------------------------------------------------------------

## 11. Rotación

Al finalizar un partido:

-   El ganador permanece.
-   Sale el jugador con más tiempo continuo en cancha.
-   Entra el primero de la cola.
-   El equipo perdedor abandona la cancha.
-   Todos pasan al final de la cola respetando el orden.

------------------------------------------------------------------------

## 12. Historial

Guardar:

-   Fecha
-   Hora
-   Equipos
-   Jugadores
-   Resultado
-   Duración
-   Sets
-   Ganador

------------------------------------------------------------------------

## 13. Estadísticas

Actualizar automáticamente:

-   Partidos
-   Victorias
-   Derrotas
-   \% de victorias
-   Último partido

------------------------------------------------------------------------

## 14. Convenciones

-   Archivos pequeños.
-   Componentes reutilizables.
-   Tipado fuerte.
-   Sin lógica duplicada.
-   Compilar después de cada módulo.

------------------------------------------------------------------------

## 15. Roadmap

Sprint 1 --- Jugadores

Sprint 2 --- Partido

Sprint 3 --- Cola

Sprint 4 --- Marcador

Sprint 5 --- Rotaciones

Sprint 6 --- Historial

Sprint 7 --- Estadísticas

Sprint 8 --- Beta 1.0

------------------------------------------------------------------------

## 16. Definición de éxito

SETPOINT estará listo cuando una jornada completa de voleibol pueda
organizarse sin utilizar papel y sin depender de herramientas externas.
