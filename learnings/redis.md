# Reference

https://redis.io/docs/latest/commands/

# 🧩 What Are Redis Hash Tags?

Hash tags are a special syntax for **Redis Cluster**, which is Redis's built-in sharding system. When you run Redis Cluster, your data is spread across multiple nodes (shards), and each key is assigned to a "hash slot" based on a hash of its name.

The problem is that **multi-key operations** (like `MULTI/EXEC` transactions, Lua scripts, or commands like `SUNIONSTORE`) **cannot span multiple nodes**. If the keys involved live on different shards, Redis throws a `CROSSSLOT` error.

Hash tags solve this by letting you **force certain keys into the same slot**. The trick is simple: if a key contains a `{...}` section, Redis only hashes the part _inside_ the braces to determine the slot.

| Key                   | What Gets Hashed                | Resulting Slot      |
| --------------------- | ------------------------------- | ------------------- |
| `user:123:profile`    | `user:123:profile` (whole key)  | Slot A              |
| `user:123:settings`   | `user:123:settings` (whole key) | Slot B (different!) |
| `{user:123}:profile`  | `user:123`                      | Slot X              |
| `{user:123}:settings` | `user:123`                      | Slot X (same!)      |

By wrapping the shared part in `{}`, you guarantee those keys land on the same node, so multi-key operations work.

### 🎯 Why You Don't Need Them (For Your Current Design)

Your design explicitly targets a **single-node Redis** (Upstash's free tier is a single node). In a single-node setup, **there are no slots and no sharding**, so the entire hash-tag concept simply does not apply. Every key lives on the same server, so every multi-key operation works natively, and your Lua scripts already execute atomically.

Your concern about correctness under concurrency is exactly why single-node is the right choice for an MVP. In a cluster, even with hash tags, you'd be introducing complexity (slot routing, potential resharding downtime) that has nothing to do with the core flash-sale logic you're trying to learn.

### ⚠️ One Subtle Upstash Detail (Not a Roadblock)

Upstash's single-node databases actually use a concept called **key-based locking** internally, and they _do_ use hash tags as the locking granularity. But this is an **internal implementation detail**—you don't need to add `{}` to your keys for it to work. If a key has no explicit hash tag, Upstash treats the entire key name as its "hash tag".

This only matters if you want to **optimize concurrency** by letting unrelated commands run in parallel. For your MVP, you don't need that optimization. Your keys are already naturally distinct (`saleId:stock`, `saleId:zset`, etc.), so Upstash's locking will treat them as separate keys and allow concurrency where safe.

### 🛡️ The Only Scenario Where You'd Care

If you ever outgrow single-node Upstash and migrate to a **Redis Cluster** (which you won't need for an MVP, and probably not even for a real flash sale with modest traffic), you'd then need to ensure all keys for a single sale share a hash tag. Your keys would become:

```
{sale:123}:stock
{sale:123}:zset
{sale:123}:bought
{sale:123}:pending
{sale:123}:idempotency
```

Then your Lua scripts (which touch multiple of these keys) would work in a cluster. But again—**this is a future problem you do not have**, and you've already made the correct architectural choice to avoid it for now.

### 📌 Summary

| Question                                           | Answer                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| What are hash tags?                                | A `{...}` syntax to force related keys into the same Redis Cluster slot |
| Do you need them now?                              | **No**—you're on a single node                                          |
| Are they relevant to your concurrency correctness? | **No**—single-node Redis already guarantees atomicity                   |
| When would you need them?                          | Only if you migrate to Redis Cluster later                              |
| Should you change your key names now?              | **No**—keep them as `saleId:stock`, etc.                                |

The suggestion you received was technically correct for _cluster_ users, but it's noise for your MVP. Stick with your single-node design, keep your keys as they are, and focus on the Lua scripts that actually matter for your flash sale logic.
