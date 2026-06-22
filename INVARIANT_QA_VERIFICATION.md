# Player State Invariant - Manual QA Verification Checklist

**Invariant Rule**: At every moment, every player belongs to exactly ONE logical location:
- Waiting Queue
- Blue Team
- Red Team  
- Finished Match (result screen only, during display)
- History (persisted records)

**Test Status Codes**:
- ✅ Pass: Invariant maintained
- ⚠️ Warning: Needs attention
- ❌ Fail: Invariant violated

---

## Step 1: Import Players (Multiple Formats)

**Test Data**:
```
John 5
Maria (4)
Player–One–3
Carlos nivel 2
Stars ★★★★★
Simple Name
```

**Checks**:
- [ ] All 6 players appear in pool (status="available")
- [ ] Players do NOT appear in teams simultaneously
- [ ] Import count matches actual pool count
- [ ] Default level (3) applied to "Simple Name"
- [ ] Levels parsed correctly: 5, 4, 3, 2, 5, 3

**Invariant Status**: ___________

---

## Step 2: Manual Team Assignment

**Steps**:
1. Open Match page
2. Manually drag John (5) → Blue Team
3. Manually drag Maria (4) → Blue Team
4. Manually drag Player-One (3) → Red Team

**Checks**:
- [ ] Blue team shows: John, Maria (count = 2)
- [ ] Red team shows: Player-One (count = 1)
- [ ] Pool shows: Carlos, Stars, Simple Name (count = 3)
- [ ] John does NOT appear in pool or red team
- [ ] Total = 2 blue + 1 red + 3 available = 6 players

**Invariant Status**: ___________

---

## Step 3: Auto-Balance Feature

**Steps**:
1. Click "Auto-Balance" button
2. System redistributes teams

**Checks**:
- [ ] Blue team ≠ manual setup (auto-balance ran)
- [ ] Red team ≠ manual setup
- [ ] All 6 players still accounted for
- [ ] Each player in exactly ONE location
- [ ] No duplicates in blue, red, or pool
- [ ] Sum of all counts = 6

**Invariant Status**: ___________

---

## Step 4: Start Match (Transition Setup → Live)

**Steps**:
1. Verify teams finalized
2. Click "Start Match"
3. Observe transition to scoreboard

**Checks**:
- [ ] Scoreboard shows current blue team
- [ ] Scoreboard shows current red team
- [ ] Queue page shows remaining available players
- [ ] Pool players status = "available"
- [ ] Team players status = "blue" or "red"
- [ ] Invariant: blue + red + available = 6 total

**Invariant Status**: ___________

---

## Step 5: Score Points

**Steps**:
1. Live scoreboard visible
2. Click blue team +1 twice (blue = 2)
3. Click red team +1 once (red = 1)
4. Observe score updates

**Checks**:
- [ ] Scoreboard updates live
- [ ] Team rosters don't change
- [ ] Blue team members still in status="blue"
- [ ] Red team members still in status="red"
- [ ] Pool count unchanged
- [ ] No players moved between locations during scoring

**Invariant Status**: ___________

---

## Step 6: Undo Last Point

**Steps**:
1. Click "Undo" button
2. Observe score revert (red = 0)

**Checks**:
- [ ] Score reverted (red: 1→0)
- [ ] Team rosters unchanged
- [ ] Player statuses unchanged
- [ ] No duplicates introduced by undo

**Invariant Status**: ___________

---

## Step 7: Finish Match (Blue Wins)

**Steps**:
1. Set score to blue = 5, red = 2
2. Click "Finish Match" → "Blue Wins"
3. Navigate to result screen

**Checks**:
- [ ] Result screen shows winner (Blue)
- [ ] Winner player names displayed
- [ ] Player statuses after finish:
  - Blue players: status = "available" (returning to pool)
  - Red players: status = "available" (returning to pool)
- [ ] All players now in pool (not in teams)
- [ ] No players stuck in "blue" or "red" status

**Invariant Status**: ___________

---

## Step 8: Next Match (Generate Opponent)

**Steps**:
1. Click "Next Match" button
2. System generates new opponent
3. UI updates to show new match setup

**Checks**:
- [ ] History updated (previous match recorded)
- [ ] New match created with fresh teams
- [ ] Pool players refreshed and available
- [ ] Previous blue/red players now status="available"
- [ ] No players remain in old team statuses
- [ ] Queue page shows updated player order
- [ ] All players accounted for (pool + queue + history)

**Invariant Status**: ___________

---

## Step 9: Rotate Players (Insert Waiting Player)

**Steps**:
1. If queue not empty, select a waiting player
2. Drag into one of the teams (e.g., Blue)
3. Remove one team member back to pool

**Checks**:
- [ ] Waiting player moved to team (status = "blue" or "red")
- [ ] Previous team member moved to pool (status = "available")
- [ ] Queue count decreased by 1
- [ ] Pool count increased by 1
- [ ] Team count unchanged
- [ ] No duplicates: old player not in queue, team, AND pool
- [ ] Rotated player not in two places simultaneously

**Invariant Status**: ___________

---

## Step 10: Return to Match Page & Verify Consistency

**Steps**:
1. Navigate back to Match page
2. Observe teams and pool
3. Check Queue page
4. Check History page

**Checks**:
- [ ] Match page teams consistent with scoreboard
- [ ] Pool shows correct available players
- [ ] Queue page shows waiting players
- [ ] History shows all completed matches with correct data
- [ ] Counts add up: pool + teams + queue + history = total unique players
- [ ] No player appears in multiple collections
- [ ] No player has conflicting statuses

**Final Invariant Status**: ___________

---

## Summary

| Step | Invariant Maintained? | Notes |
|------|----------------------|-------|
| 1    |          |  |
| 2    |          |  |
| 3    |          |  |
| 4    |          |  |
| 5    |          |  |
| 6    |          |  |
| 7    |          |  |
| 8    |          |  |
| 9    |          |  |
| 10   |          |  |

**Overall Result**: ______________________

**Breaking Changes Detected**: 
- None / List them:

**Potential Issues**:
- None / List them:

**Recommendations**:
- All invariants maintained → Beta Ready ✅
- Need fixes → List required actions:
