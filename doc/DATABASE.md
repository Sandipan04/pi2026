# Database Schema & SQL Engine

WW 3.14159 relies on **Supabase (PostgreSQL)**. To handle the Infinite Canvas, we use a "Chunking" strategy combined with server-side SQL functions to prevent client-side cheating.

## Tables

### 1. `users`
* `id` (UUID, Primary Key, references auth.users)
* `username` (Text)
* `points` (Integer, default 1000)
* `bomb_2`, `bomb_3`, `bomb_5`, `bomb_8`, `bomb_13` (Integer, ammo counts)
* `is_admin` (Boolean, default false)

### 2. `global_stats`
A single-row table tracking the community war effort.
* `id` (Integer, Primary Key)
* `total_explored` (BigInt)
* `total_coprime` (BigInt)
* `global_points` (BigInt)
* `global_tier` (Integer)

### 3. `grid_chunks`
Stores the map in 100x100 blocks to allow for infinite scaling.
* `chunk_id` (Text, Primary Key, format: `"X_Y"`)
* `data` (Text, exactly 10,000 characters long, string representing grid states)

---

## Remote Procedure Calls (RPCs)

### `fire_missile_batch`
The workhorse of the engine. Because a single bomb can overlap up to 4 different chunks, `main.js` groups the impacts by chunk and sends them to this function to securely lock and update the grid.

```sql
CREATE OR REPLACE FUNCTION public.fire_missile_batch(
    p_chunk_id text,
    p_batch jsonb,
    p_radius integer
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
-- (See Supabase UI for full function definition)
-- Handles Chunk generation, string overlaying, and updating global_stats.
$$;
```

### `admin_grant_points`
Used by the minigames to securely deposit Supply Points into a player's wallet upon victory.

```sql
CREATE OR REPLACE FUNCTION public.admin_grant_points(
    p_target_id uuid,
    p_points integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users SET points = points + p_points WHERE id = p_target_id;
    UPDATE public.global_stats SET global_points = global_points + p_points WHERE grid_size > 0;
END;
$$;
```

## Database Triggers

### `trigger_global_tier_reward`
Listens to the global_stats table. When the community earns enough points to cross a 100,000-point milestone, it automatically deposits 5,000 Supply Points into every user's wallet.

```sql
CREATE OR REPLACE FUNCTION trigger_global_tier_reward()
RETURNS TRIGGER AS $$
DECLARE
    calculated_tier integer;
BEGIN
    calculated_tier := FLOOR(NEW.global_points / 100000)::integer;
    IF calculated_tier > OLD.global_tier THEN
        NEW.global_tier := calculated_tier;
        UPDATE public.users SET points = points + 5000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tier_up
BEFORE UPDATE ON public.global_stats
FOR EACH ROW EXECUTE FUNCTION trigger_global_tier_reward();
```