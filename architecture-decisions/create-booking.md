```
What must always be true?     → 2–5 invariants
What can go wrong?            → 3–5 failure cases
How will my design prevent it?
```

For meaningful features, write a tiny note:

```
Decision:
Why:
Alternative considered:
Trade-off:
```

# Invariants

1. sales.stock_quantity >= 0
2. sales.stock_quantity decrement and addition of bookings row must be atomic
3. sales.stock_quantity decrement number === bookings.quantity
4. booking must be allowed only when sale is live
5. user must be a valid user
6. sale must be a valid sale
7. bookings.quantity > 0

# What can go wrong?

1. Concurrent request
2. DB error for sales.stock_quantity decrement
3. DB error for addition of bookings row
4. Extreme load or high number of requests
5. Server error after successful DB updates
6. Network error before request reaches the server (No handling needed)
7. Retires are possible

# My design

1. Create a migration to change from `ALTER TABLE "sales" ADD CONSTRAINT "sales_stock_quantity_positive" CHECK ("stock_quantity" > 0);` to be >= 0
2. Will wrap both operations within a transaction
3. I don't need row level locking even while checking sale is live + booking OR atomic db level WHERE case (can add for safety) but not required since DB constraint is there just need to handle that error
4. Add application level check for live sale + (maybe) add db constraint for the bookings.createdAt >= sales.start_at && bookings.createdAt < sales.end_at
5. DB relation checks if the for foreign key relations for valid sale and user hence no checks or implementation required just need to handle error cases
6. Retries will automatically fail because of `@@unique([userId, saleId])` constraints
7. Add validations for all the req body inputs

# Endpoint

POST /bookings

# Review

This is **much more architecturally important than sale creation**, and your thinking is mostly on the right track. I’d put this around **8/10**, but there are **3 important corrections** before you implement it.

## 1. Your biggest issue: `@@unique([userId, saleId])`

You said:

> Retries will automatically fail because of `@@unique([userId, saleId])`

This is **not enough for retries**.

Imagine:

```text
Client
  │
  │ POST /bookings
  ▼
Server
  │
  ├── DB transaction succeeds
  │
  ├── booking created
  │
  └── server crashes before response
          ↓
Client sees timeout
          ↓
Client retries
```

Your unique constraint prevents a duplicate booking — **good**.

But the retry receives a conflict/error rather than the original successful result.

That's not true **idempotency**.

For RushStock, eventually you want:

```text
POST /bookings + idempotencyKey
              │
              ▼
       First request
              │
        transaction
              │
       booking created
              │
       response stored
              │
              ▼
       201 + booking


Retry with same key
              │
              ▼
       Return same result
```

**Don't necessarily implement this right now.** Just recognize that `@@unique(userId, saleId)` is a duplicate-prevention mechanism, not a complete retry/idempotency solution.

---

## 2. Your live-sale handling needs more thought

You wrote:

> application level check for live sale + maybe DB constraint

The key question is:

**What exactly does "live" mean at the database operation?**

Suppose:

```text
10:00:00 sale starts
10:30:00 sale ends
```

At `10:29:59`:

```text
Request checks → sale is live ✅
```

Then time advances.

```text
10:30:01
```

If your subsequent update doesn't enforce the condition, you could potentially book an expired sale.

So I'd make the **stock decrement itself conditional**:

```text
UPDATE sales
SET stock_quantity = stock_quantity - quantity
WHERE id = saleId
  AND start_at <= NOW()
  AND end_at > NOW()
  AND stock_quantity >= quantity
```

Conceptually:

```text
                 ┌── live? ───────┐
Request ─────────┤                │
                 ├── enough stock? ┤
                 └────────────────┘
                         │
                     UPDATE
                         │
                  affected rows?
                    /          \
                   1            0
                  /              \
               success       rejected
```

This is stronger than:

```text
SELECT sale
if live:
    UPDATE sale
```

because the latter separates the **check** from the **state change**.

And this brings us to your concurrency question.

---

## Your invariants need one important addition

Your current list is good, but I'd change #1:

> `sales.stock_quantity >= 0`

and add:

> **A booking can only be created if the corresponding inventory decrement succeeded.**

Because your real business invariant is:

```text
Every booking must be backed by inventory.
```

So the critical relationship becomes:

```text
Booking.quantity
       ↓
must correspond to
       ↓
successful inventory decrement
```

Your transaction handles this.

---

## Your final architecture should look roughly like this

```text
POST /bookings
      │
      ▼
Auth middleware
      │
      ▼
Validate quantity
      │
      ▼
BEGIN TRANSACTION
      │
      ▼
Atomic UPDATE sales
WHERE:
  sale_id = ?
  sale is live
  stock >= quantity
      │
      ├── affected rows = 0
      │       ↓
      │   reject booking
      │
      └── affected rows = 1
              ↓
       INSERT booking
              │
              ├── FK violation → fail
              ├── unique violation → handle
              │
              ▼
          COMMIT
              │
              ▼
          Response
```

And because both operations are inside one transaction:

```text
UPDATE inventory ──┐
                   ├── atomic
INSERT booking ────┘
```

If booking insertion fails:

```text
UPDATE succeeded
       ↓
INSERT failed
       ↓
ROLLBACK
       ↓
inventory restored
```

That's the **core architectural lesson of RushStock**.

---
