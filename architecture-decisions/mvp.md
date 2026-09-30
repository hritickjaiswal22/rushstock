# MVP

# Tech Used - PostGresSQL, Redis, Worker for re-claim (later will then will add Delayed Message Queue with dead-letter exchange after MVP works) + Simulated Payments (a simple endpoint that will mark the booking as confirmed/failed)

# Sale creation flow

1. Admin creates a sale providing all the details like product info, quantity , sale start time and end time.
2. In the same flow (api call) just after above in redis for that sale id (generated from above) the stock is put with no TTL.

### Sale verification step

1. Admin hits the endpoint
2. In the service the logic is to take that sale_id and verify both PostGres and Redis and only if both are valid then only sale will become live and valid otherwise invalid

Note - Do not want to complicate above flow with failures, idempotency and system design scenarios so assumption is if sale verification fails the admin reaches dev to fix it.

# Schema

```
users {
  id
  name
  email
  password
  role ENUM(ADMIN, USER)
}

products {
  id
  title
  description
  price
}

sales {
  id
  authorId
  productId
  unitPrice
  inventory
  startAt
  endAt

  Unique constraint on (productId,startAt,endAt) with a gist for preventing other sale of same product within this interval
  Constraint inventory >= 0
}

orders {
  id
  saleId
  userId
  idempotencyId
  quantity (Assumed 1 always for MVP)
  status ENUM(PENDING, EXPIRED, SUCCESS, FAILED) (Will have to find a way so that status can never be changed for EXPIRED, SUCCESS, FAILED)
  expiresAt

  Unique constraint on idempotencyId
  And partial unique constraint on (saleId,userId) AND status = "SUCCESS" or "PENDING" and thus users can retry failed or expired orders with new idempotencyIds
}
```

# Redis Design

For each sale

```
saleId:stock - Stores the available stock
saleId:zset - A sorted set storing orderId,userId
saleId:bought - A set of userIds for who have successfully bought
saleId:pending - Some hash data structure which store userIds whose orders are in pending
saleId:idempotency - A map which will store orderId and using that orderId will be answered by querying PostGres (source of truth) during order flow
```

# Order flow

- Frontend generates a unique UUID V4
- The request contains saleId, userId and above generated idempotencyId
- The request hits the api servie which then

````
  - Check the idempotencyId
    ```
      if idem_key exists: (during order flow)
      cached = parse(json)
      sql_status = SELECT status FROM orders WHERE id = cached.order_id
      if sql_status == 'PENDING': return {order_id, "PENDING"}      # legit retry
      if sql_status == 'EXPIRED': return 410 Gone, "Your previous attempt expired, retry with new key"
      if sql_status == 'SUCCESS': return {order_id, "SUCCESS"}      # already paid
      if sql_status == 'FAILED':  return 410 Gone, "Payment failed, retry with new key"
    ```
    So if match return do not allow to continue further otherwise continue
  - Generate an orderId
  - Using a Lua script inside Redis execute below atomically
    ```
      check bought set if userId there return
      check pending set if userId there return
      check stock is present if not present return
      populate zset
      populate pending hash ds with (orderId,userId) with userId as key
      populate idempotency map with orderId as value and idempotencyId as key
      decrement stock
    ```
  - Start a transaction
    ```
      Check sale validity - from sales table where id=saleId AND now >= startAT AND now < endAt AND inventory >= 0 after if ok continue otherwise fail
      Insert a new orders row with status "PENDING" and expiresAt
    ```
  - If above transaction fails for some reason using Lua and Redis basically revert above redis changes
  - Return success response and asking user to pay
````

## Fixes required

- The idempotency key check must be inside the Lua script

# Pay flow (Happy Path)

- Frontend sends the request with saleId, userId and orderId
- The request hits the api servie which then

````
  - Start a transaction
    ```
      BEGIN;
      SELECT status, expires_at FROM orders
        WHERE id = ? AND user_id = ? FOR UPDATE;
      -- if status != 'PENDING' → ROLLBACK, return 409
      -- if expires_at < NOW() → ROLLBACK, return 410

      UPDATE orders SET status='SUCCESS' WHERE id=?;  -- 1 row
      UPDATE sales SET inventory = inventory - 1
        WHERE id = ? AND inventory >= 1;              -- check rowcount!
      COMMIT;
    ```
  - If above fails return failed
  - Using a Lua script inside Redis execute below atomically
    ```
      remove from zset
      add in bought set
      remove from pending set
    ```
  - Return success response
````

# Pay flow (Failed Path)

- Frontend sends the request with saleId, userId and orderId
- The request hits the api servie which then

````
  - Start a transaction
    ```
    Executes: UPDATE orders SET status="FAILED" WHERE id=orderId AND status="PENDING" AND userId=userId
    ```
  - If above fails return failed
  - Let row_count = the number of rows updated by Postgres.
  - If row_count == 0:
    `Return success early (someone else already handled this!)`
  - If row_count == 1:
  - Using a Lua script inside Redis execute below atomically
    ```
      if ZREM zset member == 1:
        INCR stock
        HDEL pending user_id
    ```
  - Return success response
````

#### Note - For above flows the userId will come from JWT all the endpoints are auth middleware gated

# Worker flow

```
Every 30s:
candidates = ZRANGEBYSCORE {sale_id}:zset:expiry -inf now LIMIT 0 100

For each member "order_id:user_id":

  // 1. THE SMART UPDATE
  row_count = EXECUTE(
    UPDATE orders SET status='EXPIRED' WHERE id = order_id AND status = 'PENDING'
  )

  if row_count == 1:
    // Postgres says: "I successfully changed it from PENDING to EXPIRED."
    // Redis Action: Safely remove from ZSET, return stock, delete pending.
    Lua: if ZREM zset member == 1: INCR stock; HDEL pending user_id

  else:
    // Postgres says: "I did nothing. The status was NOT PENDING."
    // 2. THE LOCKLESS SELECT (Safe, because the state is now terminal)
    current_status = EXECUTE(SELECT status FROM orders WHERE id = order_id)

    // 3. THE REDIS CLEANUP
    if current_status == 'SUCCESS':
      // The user successfully paid! Do NOT increment stock.
      // We still use ZREM == 1 to make sure we only clean this up once.
      Lua: if ZREM zset member == 1: HDEL pending user_id and redis.call('SADD', bought_key, user_id)

    else if current_status == 'FAILED' or current_status == 'EXPIRED' or current_status == NULL:
      // The payment failed, or was expired by something else.
      // We need to return the stock.
      Lua: if ZREM zset member == 1: INCR stock; HDEL pending user_id
```

# Review

https://chat.deepseek.com/a/chat/s/61f9720d-1ff9-4fba-8ec3-f1d433fe0eef

### Gaps

- Bug 1 — Schema: The "unique constraint" is not an overlap constraint (This is already solved)
- Bug 2 — Order flow: Idempotency check-then-set is racy (Fix - The idempotency key check must be inside the Lua script)
- Bug 3 — Worker: Lock is released before the update (Already fixed above)
- Bug 4 — Pay-failure path: Redis Lua is unconditional (Already fixed above)
- Bug 5 — Pay-flow SQL: Missing FOR UPDATE, missing rowcount checks, wrong predicate (Already fixed above)
- Bug 6 — Phantom idempotency keys (Will ask fronend to retry with new idempotency key and let worker be the only enetity to re-stock)
- Bug 7 — Worker does not SADD bought on SUCCESS cleanup (Fixed above)
- Gap A - No Redis-lost-data recovery (Ignoring since MVP)
- Gap B — Idempotency map per sale grows unbounded (Will add proper TTL for all redis keys or set)
- Gap C — Redis key naming inconsistency (Will set it up like that)
- Gap D — No cleanup of bought / pending after sale ends (As said TTL will take care of it)
- Gap E — Compensating Lua must delete the idempotency key (I meant the idempotency as well)
