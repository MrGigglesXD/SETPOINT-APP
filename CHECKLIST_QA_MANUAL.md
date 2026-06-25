# 🧪 CHECKLIST QA MANUAL — FASES 1-7

**Fecha de validación**: 24 de junio de 2026  
**Build**: ✅ 1609 módulos sin errores  
**Tests**: ✅ 50/50 pasando  

---

## ✅ FASE 1 — MARCADOR

### 1.1 Reacción automática a match_completed
- [ ] Crear partido exhibición con 2 equipos
- [ ] Iniciar partido
- [ ] Jugar hasta que uno alcance 15 puntos
- [ ] Verificar: Toast "✓ Gana [Equipo]" aparece
- [ ] Verificar: Pantalla de resultado aparece automáticamente
- [ ] Verificar: NO hay pantalla "Abrir marcador" intermedia

### 1.2 Eliminación de ciclo "Abrir marcador"
- [ ] Después de resultado, verificar que NO hay botón "Abrir marcador"
- [ ] Verificar que los botones son: Generar siguiente, Revancha, Historial, Inicio
- [ ] Clicear "Generar siguiente" → debe ir a MatchPage
- [ ] Verificar: NO regresa a "Abrir marcador"

---

## ✅ FASE 2 — RESULTADO

### 2.1 Pantalla de resultado simplificada
- [ ] Pantalla muestra: "Gana [Equipo]" en amarillo
- [ ] Muestra puntuación: Azul vs Rojo (números grandes)
- [ ] Muestra duración: ⏱ HH:MM:SS
- [ ] Muestra sets (si es oficial)
- [ ] Muestra nombres de jugadores ganadores
- [ ] Layout es limpio y no tiene botones extras

### 2.2 Botones funcionales
- [ ] **Generar siguiente partido**: Click → genera opuesto automático
- [ ] **Revancha**: Click → mismos equipos en nuevo match
- [ ] **Historial**: Click → navega a HistoryPage (sin limpiar resultado)
- [ ] **Inicio**: Click → limpia resultado y va a pantalla home

### 2.3 Botón Editar removido
- [ ] Verificar que NO existe botón "✏ Editar" en pantalla resultado
- [ ] Verificar que los botones son exactamente 4 (no más)

---

## ✅ FASE 3 — PARTIDO

### 3.1 Nivel junto al nombre
- [ ] En TeamPanel, cada jugador muestra: "Nombre • ⭐⭐"
- [ ] Los levelStars se ven correctamente (1-5 estrellas)
- [ ] Se actualiza cuando cambias el nivel de un jugador

### 3.2 Promedio de nivel
- [ ] En encabezado Equipo Azul, aparece: "Equipo Azul · 3.2" (con promedio)
- [ ] En encabezado Equipo Rojo, aparece: "Equipo Rojo · 2.8" (con promedio)
- [ ] El promedio se actualiza cuando:
  - [ ] Agreguas un nuevo jugador
  - [ ] Eliminas un jugador
  - [ ] Cambias el nivel de un jugador
- [ ] Cuando no hay jugadores, no muestra promedio

### 3.3 Mejorada UI de eliminación
- [ ] Hovering sobre chip de jugador muestra cambio de color
- [ ] Ícono X es visible (mediano, no pequeño)
- [ ] Cursor cambia a pointer al hover
- [ ] Click en X elimina jugador sin confirmar
- [ ] Tooltip aparece: "Eliminar [Nombre]"

### 3.4 Generar Equipo Contrincante limitado
- [ ] En Exhibición: Botón "Generar Equipo Contrincante" está HABILITADO
- [ ] En Oficial 3 sets: Botón está DESHABILITADO
- [ ] En Oficial 5 sets: Botón está DESHABILITADO
- [ ] Hover en botón deshabilitado muestra: "Solo disponible en exhibición"

---

## ✅ FASE 4 — COLA

### 4.1 Orden FIFO visible
- [ ] Importa 5+ jugadores
- [ ] Navega a Cola
- [ ] Verifica que están numerados 1, 2, 3, 4...
- [ ] Número está en amarillo, visible

### 4.2 Tiempo esperando
- [ ] Para cada jugador en cola, muestra: "X minutos esperando"
- [ ] Los minutos se actualizan cada 5 segundos
- [ ] Formato es consistente

### 4.3 Orden respetado
- [ ] Completa un partido
- [ ] Verifica que los equipos anteriores se fueron de la cola
- [ ] Nuevos jugadores entran al final
- [ ] Orden FIFO se mantiene

### 4.4 Botón Actualizar Orden
- [ ] Botón "Actualizar Orden" existe
- [ ] Click actualiza la numeración
- [ ] Toast: "✓ Orden actualizado (X jugadores)"

---

## ✅ FASE 5 — JUGADORES

### 5.1 Importación respeta orden
- [ ] Importa texto: "José 3\nMaría 4\nPedro 2"
- [ ] Verifica orden: José (1er), María (2da), Pedro (3er)
- [ ] Niveles preservados: José 3, María 4, Pedro 2

### 5.2 Estados correctos
- [ ] Nuevo jugador: Estado "Disponible" → espera en cola
- [ ] Cuando se arma equipo: Cambio a "Azul" o "Rojo"
- [ ] Cuando se completa partido: Cambio a "Ausente"

### 5.3 No muestra "Ahora mismo"
- [ ] PlayersPage NO muestra timestamp "Ahora mismo"
- [ ] Solo muestra: Nombre, Nivel, Estado

---

## ✅ FASE 6 — ESTADÍSTICAS

### 6.1 Tarjetas superiores
- [ ] Muestra: "Partidos jugados" con número total
- [ ] Muestra: "Victorias totales" con número total
- [ ] Los números se actualizan después de completar partido

### 6.2 Ranking por % victorias
- [ ] Ordena por tasa de victorias (mayor %)
- [ ] Desempate: por número de victorias (más wins)
- [ ] Muestra:
  - [ ] Posición (1, 2, 3...)
  - [ ] Nombre
  - [ ] Nivel
  - [ ] Partidos jugados (PJ)
  - [ ] Victorias (W) en verde
  - [ ] Derrotas (L) en rojo
  - [ ] Porcentaje (%)

### 6.3 Actualización automática
- [ ] Completa un partido
- [ ] Vuelve a StatsPage
- [ ] Verify que los números se actualizaron
- [ ] Los jugadores que jugaron tienen +1 PJ
- [ ] El ganador tiene +1 W, el perdedor +1 L

---

## ✅ FASE 7 — HISTORIAL

### 7.1 Nunca hay 0-0
- [ ] Busca en HistoryPage un partido con score 0-0
- [ ] Verifica que NO existe

### 7.2 Duración correcta
- [ ] Completa un partido rápido (~2 minutos)
- [ ] En historial, verifica duración ≈ 2:00
- [ ] Formato es MM:SS o HH:MM:SS si es más largo

### 7.3 Ganador registrado
- [ ] Completa un partido
- [ ] En historial, verifica ganador es correcto (Azul o Rojo)
- [ ] Pill de color correcto (azul/rojo)

### 7.4 Jugadores validados
- [ ] Verifica que lista de jugadores coincide con equipos originales
- [ ] Formato: "Nombre1, Nombre2, ..." por equipo

### 7.5 Sincronización con estadísticas
- [ ] Completa un partido
- [ ] Ve a Historial → verifica partido aparece
- [ ] Ve a Estadísticas → verifica jugadores tienen nuevas stats
- [ ] Los datos coinciden (ganador, score, jugadores)

---

## 🎯 FLUJO END-TO-END RECOMENDADO

### Setup inicial (~5 minutos)
1. [ ] Importar 8-10 jugadores con niveles variados
2. [ ] Verificar que aparecen en PlayersPage ordenados
3. [ ] Verificar que aparecen en QueuePage con orden correcto

### Crear y jugar partido exhibición (~15 minutos)
1. [ ] Ir a MatchPage
2. [ ] Seleccionar Exhibición, 4 vs 4, 15 puntos
3. [ ] Generar Equipos Balanceados
4. [ ] Verificar promedio de nivel en ambos equipos
5. [ ] Iniciar partido
6. [ ] Jugar hasta que uno llegue a 15 puntos
7. [ ] Verificar resultado automático
8. [ ] Ver botones en resultado (4 exactos)
9. [ ] Clicear "Generar siguiente partido"

### Crear y jugar partido oficial (~15 minutos)
1. [ ] Seleccionar Oficial 3 sets, 4 vs 4
2. [ ] Verificar que botón "Generar Contrincante" está DESHABILITADO
3. [ ] Armar equipos manualmente
4. [ ] Iniciar partido
5. [ ] Jugar un set completo (hasta 25 puntos)
6. [ ] Verificar set_completed toast
7. [ ] Jugar hasta terminar (win by 2)
8. [ ] Verificar resultado

### Validar datos finales (~10 minutos)
1. [ ] Ir a Estadísticas
2. [ ] Verifica que jugadores tienen stats actualizadas
3. [ ] Ir a Historial
4. [ ] Verifica que aparecen ambos partidos
5. [ ] Verifica que no hay 0-0
6. [ ] Verifica que duraciones son razonables

---

## ❌ PROBLEMAS A DETECTAR

Si encuentras estos problemas, **NO PASAR a producción**:

- [ ] ❌ Pantalla "Abrir marcador" aparece después de resultado
- [ ] ❌ Partido se completa pero resultado NO aparece automáticamente
- [ ] ❌ Build tiene errores de TypeScript
- [ ] ❌ Tests fallan
- [ ] ❌ Promedio de nivel no se calcula o es incorrecto
- [ ] ❌ Botón "Generar Contrincante" NO está deshabilitado en oficial
- [ ] ❌ Historial muestra partido 0-0
- [ ] ❌ Estadísticas no se actualizan después de completar partido
- [ ] ❌ UI de eliminación de jugadores es confusa (ícono X no visible)
- [ ] ❌ Hover effects no funcionan en chips de jugadores

---

## ✅ CHECKLIST FINAL

Antes de dar OK:

- [ ] **Build**: `npm run build` → sin errores
- [ ] **Tests**: `npm test -- --run` → 50/50 pasando
- [ ] **QA Manual**: Completar flujo end-to-end arriba
- [ ] **Documentación**: Leer ESTADO_PROYECTO_FINAL.md
- [ ] **Cambios**: Revisar IMPLEMENTACION_RESUMEN.md

---

## 📝 NOTAS

- Los cambios son **localizados** (3 archivos)
- No afectan la **lógica del backend**
- Son principalmente **UI/UX improvements**
- **Riesgo bajo** de regresiones

---

**Status**: 🟢 LISTO PARA QA MANUAL

