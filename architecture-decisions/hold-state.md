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

# The best plan for next step that I came up with

1. Changes in schema a new table `holds` is created with `userId`, `saleId`, `quantity`, `status`, `hold_expires_at` (Maybe add a db level check that status can be updated to a specific value only once)
2. `status` can have values 'in-progress', 'failed', 'success'
3. Now whenever someone buys the product in sale
   - A transaction is started
   - Using row locking `SELECT ... FOR UPDATE`
   - Checked if sale is live and required stock quantity is there
   - If no then user is responded, if yes then
   - stock is decremented , new row is added is added to `holds` table and `status` to 'in-progress' and `hold_expires_at` set to 'now() + 5 mins' no row added to bookings and user is responded with to make payment (I don't know how to implement payments)
   - Now conceptually a background worker (I don't know how to implement this yet so thinking every 1 sec via setInterval) should run to check if payment is successfully completed (I don't know how to implement payments)
     - if succeeded then in a transaction update status to 'success' and create successful booking
     - if `now()` > `hold_expires_at` then in a transaction update the status to 'failed', and 're-stock' it

# What can go wrong?

Currently the flow for buying is

```text
Client
  │
  │ POST /bookings
  ▼
Server
  ├── If the request fails here no issues appropriate user response
  ├── Transaction begins
  ├── If failure happens here no issues appropriate user response
  ├── Stock decremented
  ├── If failure happens here rollback since in a transaction no issues appropriate user response
  ├── Row added to `holds` table and `status` to 'in-progress' and `hold_expires_at` set to 'now() + 5 mins' + corresponding values
  ├── If failure happens here rollback since in a transaction no issues appropriate user response
  ├── COMMIT
  ├── If failure happens here then user will not get a success response and will not know to make payment do not how handle this 😞
  └── Success response to user

  │   Worker Flow (I don't know how to implement this yet so thinking every 1 sec via setInterval for that specific hold.id)
  ├── check payment (do not how handle this 😞) if succeeded then in a transaction update status to 'success' and create successful booking and kill this setInterval
  ├── If anywhere within the transaction failure happens no handling required will rollback automatically
  ├── check if `now()` > `hold_expires_at` then in a transaction update the status to 'failed', and 're-stock' it and kill this setInterval
  ├── If anywhere within the transaction failure happens no handling required will rollback automatically
  ├── COMMIT
  └── Do not know how to handle the case where worker keeps failing 😞
```

# Why

1. A new table `holds` - for simplicity + future extendibility

# Alternatives

Couldn't think of any 😞

# Trade-off

Couldn't think of any 😞
