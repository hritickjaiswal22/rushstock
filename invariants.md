# And here's the part I really want you to do differently

### Sale invariants

```text
1. start < end

2. stock_quantity > 0

3. unit_price >= 0

4. A product cannot have overlapping sales

5. Only ADMIN can create a sale
```

### Booking invariants

```text
6. quantity > 0

7. User can book a sale only while LIVE

8. Booking cannot reduce stock below 0

9. A user's booking for a sale is unique

10. Booking + inventory decrement are atomic
```

And the **most important invariant**:

> **If a sale has N available units and M concurrent requests collectively request more than N units, the total successfully booked quantity must never exceed N.**

That's the heart of the project.

Once you can guarantee that, **you are no longer building another CRUD app.**

You're building a small concurrency-sensitive system.

Then after V1 works, we deliberately **break the happy-world assumption** by introducing holds. That's when the schema grows rather than trying to predict the entire final architecture today.
