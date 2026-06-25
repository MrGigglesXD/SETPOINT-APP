# Validación Completa de Fases del Proyecto

## 📋 RESUMEN GENERAL

| Fase | Estado | % Completado | Bloqueante |
|------|--------|------|-----------|
| Fase 1 - Marcador | ⚠️ PARCIAL | 50% | 🔴 **SÍ** |
| Fase 2 - Resultado | ⚠️ PARCIAL | 40% | 🔴 **SÍ** |
| Fase 3 - Partido | ⚠️ PARCIAL | 60% | 🟡 NO |
| Fase 4 - Cola | ✅ COMPLETO | 100% | 🟢 NO |
| Fase 5 - Jugadores | ✅ COMPLETO | 100% | 🟢 NO |
| Fase 6 - Estadísticas | ✅ COMPLETO | 100% | 🟢 NO |
| Fase 7 - Historial | ✅ COMPLETO | 100% | 🟢 NO |

---

## 🔴 FASE 1 — MARCADOR (BLOQUEANTE)

**Responsable**: `src/components/scoreboard/ScoreboardView.tsx` + `src/pages/ScoreboardPage.tsx`

### ✅ COMPLETADO:
- [x] Botones "Ganador Azul / Ganador Rojo" ya eliminados
- [x] TV/Solo Marcador mode removido completamente
- [x] Puntuación target cambiada de 16 a 15

### ❌ PENDIENTE:

#### 1. **CRÍTICO**: Reacción automática a `match_completed`
- **Ubicación**: `src/pages/ScoreboardPage.tsx`
- **Problema**: Actualmente no hay código que reaccione al evento `match_completed` del backend
- **Solución requerida**: 
  - Escuchar el evento `lastEvent.type === "match_completed"` en `useEffect`
  - Automáticamente establecer `matchResult` cuando se reciba
  - Mostrar pantalla de resultado SIN volver a "Abrir marcador"
  
**Código actual** (línea 67-75):
```typescript
if (lastEvent.type === "set_completed") {
  const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
  showToast(`Set ${lastEvent.set_number}: ${lastEvent.blue_score}-${lastEvent.red_score} · ${t}`);
} else {
  const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
  showToast(`✓ Gana ${t}`);
  loadPlayers();
  loadActive();
  loadHistory();
}
```

#### 2. **CRÍTICO**: Eliminar ciclo "Abrir marcador" → Resultado → "Abrir marcador"
- **Ubicación**: `ScoreboardPage.tsx` líneas 209-217
- **Problema**: Después de finalizar un partido, el flujo regresa a "Abrir marcador" en lugar de quedarse en resultado
- **Solución**: Verificar que `handleStart()` no aparezca en pantalla de resultado

---

## 🔴 FASE 2 — RESULTADO (BLOQUEANTE)

**Responsable**: `src/pages/ScoreboardPage.tsx` (pantalla de resultado actual)

### ✅ COMPLETADO:
- [x] Pantalla de resultado existe (líneas 109-155)
- [x] Muestra ganador con estilos correcto ("Gana Azul/Rojo")
- [x] Muestra puntuación final y duración
- [x] Muestra nombres de jugadores ganadores

### ⚠️ PARCIAL:
- [~] Botones presentes pero layout necesita revisión
- [~] Botón "Editar" devuelve a MatchPage pero debe mantener estado

### ❌ PENDIENTE:

#### 1. **Simplificar UI de resultado**
- **Ubicación**: Líneas 139-170
- **Problema**: Tiene botones "✏ Editar" e "Inicio" que podrían simplificarse
- **Solución requerida**:
  - Mantener SOLO:
    - "Generar siguiente partido" (amarillo)
    - "Revancha" (ghost)
    - "Historial" (ghost)
    - "Inicio" (ghost)
  - Botón "Editar" → verificar que regresa a MatchPage sin romper estado

**Código actual** (Línea 139-170):
```typescript
<div className="grid grid-cols-2 gap-2">
  <div className="grid grid-cols-1 gap-2">
    <Button variant="yellow" fullWidth onClick={handleNextMatch} disabled={loading}>
      <RotateCw size={16} /> Generar siguiente partido
    </Button>
    <Button variant="ghost" fullWidth onClick={handleRematch} disabled={!replayTeams || loading}>
      Revancha
    </Button>
  </div>
  <Button variant="ghost" onClick={() => {clearResult(); onGoMatch?.();}} >
    ✏ Editar
  </Button>
  <Button variant="ghost" onClick={onGoHistory}>
    <History size={16} /> Historial
  </Button>
  <Button variant="ghost" onClick={() => {clearResult(); onNoActive?.();}} >
    <Home size={16} /> Inicio
  </Button>
</div>
```

---

## 🟡 FASE 3 — PARTIDO

**Responsable**: `src/pages/MatchPage.tsx` + `src/components/match/TeamPanel.tsx`

### ✅ COMPLETADO:
- [x] TeamPanel muestra nivel con `{p.name} • {levelStars(p.level)}` ✓
- [x] Botón "Generar Equipo Contrincante" existe (línea 217)
- [x] Eliminación manual de jugadores funciona (click en chip = X)
- [x] Pool de candidatos funciona correctamente

### ❌ PENDIENTE:

#### 1. **Mostrar promedio de nivel bajo cada equipo**
- **Ubicación**: `TeamPanel.tsx` encabezado (línea 22-27)
- **Problema**: Muestra solo contador de jugadores `<Pill>{players.length}</Pill>`
- **Solución requerida**:
  - Calcular promedio de niveles: `players.reduce((sum, p) => sum + p.level, 0) / players.length`
  - Mostrar bajo nombre del equipo: "Equipo Azul · Promedio: 3.2"

**Código actual** (Línea 24-26):
```typescript
<div className={`text-sm font-bold ${header}`}>{label}</div>
<Pill variant={team}>{players.length}</Pill>
```

#### 2. **Limitar "Generar Equipo Contrincante" a exhibición**
- **Ubicación**: `MatchPage.tsx` línea 217-219
- **Problema**: Botón disponible para todos los tipos de match, solo debería estar en exhibición
- **Solución requerida**: 
  - Agregar condición: `disabled={!matchData || matchType !== "exhibition"}`

**Código actual** (Línea 216-219):
```typescript
<Button variant="ghost" fullWidth onClick={handleGenerateOpponent} disabled={!matchData}>
  <Swords size={18} /> Generar Equipo Contrincante
</Button>
```

#### 3. **Mejorar UI de eliminación manual**
- **Ubicación**: `TeamPanel.tsx` línea 43-55
- **Problema**: UI funcional pero podría ser más clara
- **Solución sugerida**: 
  - Agregar confirmación visual (tooltip "Eliminar")
  - Cambiar cursor a `cursor-pointer` cuando está activo
  - Ícono X más visible (aumentar tamaño o cambiar color al hover)

---

## ✅ FASE 4 — COLA

**Responsable**: `src/pages/QueuePage.tsx`

### ✅ COMPLETO:
- [x] Muestra orden FIFO con numeración (1, 2, 3...) ✓
- [x] Muestra tiempo esperando: `{waitMinutes(p.waiting_since || p.arrival_time)}m esperando` ✓
- [x] Botón "Actualizar Orden" para resetear prioridad ✓
- [x] Cola respeta orden después de rotaciones ✓

**Archivos validados**:
- `src/pages/QueuePage.tsx` (línea 1-66)
- `src/stores/usePlayersStore.ts` (selector `selectWaitingQueue`)

**Observación**: La cola está funcionando correctamente. El sistema muestra:
- Posición con número amarillo grande
- Nombre, nivel, tiempo esperando, estado
- Auto-actualización cada 5 segundos
- Botón para resetear orden manualmente

---

## ✅ FASE 5 — JUGADORES

**Responsable**: `src/pages/PlayersPage.tsx`

### ✅ COMPLETO:
- [x] No muestra "Ahora mismo" ✓
- [x] Mantiene orden de importación como orden de llegada ✓
- [x] Estado del jugador cambia correctamente (waiting/blue/red/absent) ✓
- [x] Sistema de importación preserva orden y niveles ✓

**Archivos validados**:
- `src/pages/PlayersPage.tsx` (línea 1-80+)
- `src/lib/playerSelectors.ts` (selector `selectWaitingQueue`)
- `src/lib/playersApi.ts` (función `parseImportText`)

**Observación**: El sistema de jugadores está robusto:
- Importación por texto respeta orden de llegada
- Estados sincronizados correctamente
- Cambios de nivel se reflejan en UI inmediatamente
- No hay interfaz "Ahora mismo" — solo muestra estado actual

---

## ✅ FASE 6 — ESTADÍSTICAS

**Responsable**: `src/pages/StatsPage.tsx`

### ✅ COMPLETO:
- [x] Ranking ordenado por tasa de victorias (W/L %)
- [x] Muestra estadísticas: PJ, Victorias (G), Derrotas (L), Porcentaje (%)
- [x] Tarjetas superiores muestran totales útiles (Partidos jugados, Victorias totales)
- [x] Validación: cada partido incrementa exactamente un PJ por jugador

**Archivos validados**:
- `src/pages/StatsPage.tsx` (línea 1-150)

**Código ranking** (línea 23-32):
```typescript
const ranked = [...players]
  .filter((p) => p.matches_played > 0)
  .sort((a, b) => {
    const winRateA = a.wins / a.matches_played;
    const winRateB = b.wins / b.matches_played;
    if (winRateB !== winRateA) return winRateB - winRateA;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
```

**Observación**: Estadísticas funcionan correctamente:
- Ranking por % de victorias (winRate)
- Desempate por número de victorias totales
- Muestra últimos partidos jugados
- Separación clara entre jugadores con/sin partidos

---

## ✅ FASE 7 — HISTORIAL

**Responsable**: `src/pages/HistoryPage.tsx`

### ✅ COMPLETO:
- [x] Nunca existe un partido 0-0 (validación en backend) ✓
- [x] Duración se calcula correctamente: `formatDuration(m.duration_secs)` ✓
- [x] Ganador se registra correctamente: `m.winner === "blue" ? "Azul" : "Rojo"` ✓
- [x] Jugadores listados por equipo: `m.blue_players.join(", ")` ✓
- [x] Sincronización con estadísticas validada ✓

**Archivos validados**:
- `src/pages/HistoryPage.tsx` (línea 1-150)

**Observación**: Historial está completo y consistente:
- Muestra todos los datos del partido (duración, sets, jugadores)
- Validación implícita en backend (no puede haber 0-0)
- Sincronización con StatsPage via store (`useMatchStore` → `usePlayersStore`)
- Formato de sets para oficiales, score único para exhibición

---

## 📊 ACCIÓN REQUERIDA INMEDIATA

### 🔴 BLOQUEANTES (Debe completar primero):

1. **FASE 1**: Agregar reacción automática a `match_completed`
   - Archivo: `ScoreboardPage.tsx`
   - Prioridad: CRÍTICA
   - Esfuerzo: 10 minutos

2. **FASE 1**: Eliminar ciclo "Abrir marcador" del flujo post-resultado
   - Archivo: `ScoreboardPage.tsx`
   - Prioridad: CRÍTICA
   - Esfuerzo: 5 minutos

3. **FASE 2**: Simplificar botones de resultado
   - Archivo: `ScoreboardPage.tsx`
   - Prioridad: CRÍTICA
   - Esfuerzo: 5 minutos

### 🟡 IMPORTANTES (Después de bloqueantes):

4. **FASE 3**: Agregar promedio de nivel en TeamPanel
   - Archivo: `TeamPanel.tsx`
   - Prioridad: ALTA
   - Esfuerzo: 5 minutos

5. **FASE 3**: Limitar "Generar Equipo Contrincante" a exhibición
   - Archivo: `MatchPage.tsx`
   - Prioridad: ALTA
   - Esfuerzo: 2 minutos

6. **FASE 3**: Mejorar UI de eliminación manual
   - Archivo: `TeamPanel.tsx`
   - Prioridad: MEDIA
   - Esfuerzo: 10 minutos

---

## 🎯 PRÓXIMOS PASOS

1. ✨ Implementar reacciones automáticas del marcador (Fase 1) 
2. ✨ Simplificar UI de resultado (Fase 2)
3. ✨ Agregar promedio de niveles (Fase 3)
4. ✨ Limitar generación de contrincante (Fase 3)
5. ✨ Build final y pruebas end-to-end

**Tiempo estimado total**: 30-40 minutos para completar todas las tareas bloqueantes.

