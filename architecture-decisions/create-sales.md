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

1. start_at < end_at
2. authorId must be ADMIN
3. product_id must be of a valid product
4. stock_quantity > 0
5. unit_price > 0
6. No overlapping sales

# Endpoint

POST /sales

# What can go wrong?

1. Invalid inputs
2. Normal user tries to create the sale
3. Someone tries to create overlapping sales
4. System can be loaded with several small interval sales like 1s,2s long
5. Currently the system has only 1 server + 1 db so only either request to server can fail which is not a problem to be solved otherwise db failure can happen

# My design

1. auth middleware
2. Validations via Zod for all the inputs + check start_at < end_at ; end_at - start_at > 30 mins
3. I will add a db check for the given product_id if valid or not if not throw appropriate error
4. Overlapping sales will be rejected by db gist constraints just have to handle it in error handler
5. Use prima.sales.create(input) for creating and return success response
