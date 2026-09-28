# MVP

# Tech Used - PostGresSQL, Redis, Worker for re-claim (later will then will add Delayed Message Queue with dead-letter exchange after MVP works) + Simulated Payments (a simple endpoint that will mark the booking as confirmed/failed)

# Sale creation flow

1. Admin creates a sale providing all the details like product info, quantity , sale start time and end time.
2. In the same flow (api call) just after above in redis for that sale id (generated from above) the stock is put with no TTL.

### Sale verification step

1. Admin hits the endpoint
2. In the service the logic is to take that sale_id and verify both PostGres and Redis and only if both are valid then only sale will become live and valid otherwise invalid

Note - Do not want to complicate above flow with failures, idempotency and system design scenarios so assumption is if sale verification fails the admin reaches dev to fix it.

VAR EXPIRATION_PERIOD = 5 or 10 mins

# Order flow

- User clicks on 'Buy Now'
- The frontend generates a idempotency key (UUID V4) and sends it with the request which reaches the api service
- The api service then
  - 🤔 What if the server dies here - No effect at all
  - The server generates the order_id (UUID V4)
  - 🤔 What if the server dies here - No effect at all since the order id was not saved
  - Server runs the Lua script in Redis:
    ```
      Server checks the idempotency key if already present return cached data (Not sure what is exactly that cached data , what data structure is used and how will user know the state from cached data) but not allowd to move forward if match otherwise
      SISMEMBER bought  -> if yes, -3
      SISMEMBER pending -> if yes, -2
      DECR stock
      if < 0: INCR back, -1
      ZADD zset:expiry  order_id:user_id, expiry_ts
      SADD set:pending  user_id
      SET idem:{idempotency_key} "PENDING" EX 86400
      return remaining_stock
    ```
  - 🤔 What if the server dies here - The worker will be in charge of re-conciliation after will poll from zset to check what are later than EXPIRATION_PERIOD and re-concile them and their corresponding SQL row.
  - Then insert the Postgres row (PENDING). If the Postgres insert fails on the partial unique index, call a compensating Lua script that undoes the Redis reservation:
    ```
       SREM set:pending  user_id
       ZREM zset:expiry  order_id:user_id
       INCR stock
       Not sure about idempotency state in redis over here but according to me if above fails then should also remove the idemptoncy key as well
    ```
  - 🤔 What if the server dies here - No harm done just simple reliance on idempotency key for retries
  - Return to user response success and to make payment along with orderId

- User receives the success response and proceeds to pay flow

# Pay flow (Happy Path or Success Path)

- Simulated payment endpoint is hit by frontend the request must have idempotency key and order id
- The api service then
  - 🤔 What if the server dies here - No harm done ok
  - Checks the idempotency key (Not sure how it checks but I think if not exist or not pending return error)
  - 🤔 What if the server dies here - No harm done ok
  - Start a SQL transaction
    ```
        Check orderId and update order status to "SUCCESS"
        If unique index violates, throw appropriate error
    ```
  - 🤔 What if the server dies here - Not sure maybe the worker can re-concile
  - Server runs the Lua script in Redis:
    ```
        SADD  set:bought   user_id
        SREM  set:pending  user_id
        ZREM  zset:expiry  order_id:user_id
        I guess should also update the idempotency key's status not sure
    ```
  - 🤔 What if the server dies here - Simple idempotency handle
  - Return success response

# Worker flow

- Runs every 30s (configured according to optimality not a hard decide number)
- For each run
  ```
      Server runs the Lua script in Redis:
        Polls redis zset for expired holds by making use of now() >= EXPIRATION_PERIOD
        For each expired value, remove from set:pending , zset:expiry and stock count +1
        And returns those orderIds
      🤔 What if the worker dies in between or even how to handle worker failure cases will it lead to split brain
      Take those orderIds and flip their statuses to EXPIRED using transactions
  ```

# Schema

```
users {
    id
    name
    email
    password
    type ENUM(user, admin)
}

products {
    id
    name
    description
    price
    ...
}

sales {
    id
    authorId
    productId
    unitPrice (sale_price)
    quantity (inventory)
    endAt
    startAt

    Unique constraint on (productId, startAt, endAt) with a gist to prevent overlapping sales for the same product
}

orders {
    id
    userId
    saleId
    quantity(for now consider only 1)
    expires_at
    status ENUM('PENDING', 'SUCCESS', 'EXPIRED')

    CREATE UNIQUE INDEX one_live_order_per_user_per_sale
    ON orders (sale_id, user_id)
    WHERE status IN ('PENDING', 'SUCCESS');

    Now a user can have at most one row that is either PENDING or SUCCESS for a given sale. EXPIRED and FAILED rows are not counted, so once a pending order expires, they can retry.

    This single index already covers "one successful purchase", because a SUCCESS row counts as live.

    You still need a cleanup job that flips old PENDING rows to EXPIRED, otherwise the index will block a user forever.

    And make sure the system is never able to flip SUCCESS, EXPIRED or FAILED statuses
}
```

Redis Design

You need three structures per sale, not one:

```
    stock:{sale_id}          string   -> available stock counter,
    zset:expiry:{sale_id}    zset     -> member = "order_id:user_id",
    set:pending:{sale_id}    set      -> user_ids with an active reservation
    set:bought:{sale_id}     set      -> user_ids who already succeeded
```

Also need to store idempotency keys but not sure what data structure to use

Why each:

- zset:expiry → lets a worker find expired reservations quickly (sorted by time).

- set:pending → O(1) check "does this user already have a live reservation?"

- set:bought → O(1) check "did this user already win this sale?"

```
    SET stock:{sale_id} <inventory>
    EXPIREAT stock:{sale_id} <sale_end + 24h>
    EXPIREAT set:pending:{sale_id} <sale_end + 24h>
    EXPIREAT set:bought:{sale_id}  <sale_end + 7d>
    EXPIREAT zset:expiry:{sale_id} <sale_end + 24h>
```

# Questions

- How to handle worker failure cases
- What if the worker tries multiple times
- Does worker have to handle the case where failure happend during pay flow
- What other edge cases am I missing
