# MVP

# Tech Used - PostGresSQL, Redis, Worker for re-claim (later will then will add Delayed Message Queue with dead-letter exchange after MVP works) + Simulated Payments (a simple endpoint that will mark the booking as confirmed/failed)

# Sale creation flow

Admin creates a sale with product and inventory

# Order flow

1. User clicks on 'Buy Now'
2. Request reaches server api service
3. Check via lua + redis if inventory there if not return sold old to user
4. If there using lua decrement then in postgres add a row with status pending
5. Return success and ask user to complete payment

# Pay flow

1. User/frontend hits /confirm endpoint (fake payment) (make sure also to handle failure cases)
2. If success the api service updates the status of orderId to success or failed corresspondingly
3. Return according result to user/frontend

# Questions

0. Is above mental map for MVP even correct or am do I have gaps ???
1. Where does idempotency fits in above ???
2. Before the sale how is redis populated ???
3. How to handle cases like payment retries ???
4. For order flow -> Suppose redis decrement happens but before postgres row is pushed the sever dies then ??? There is no transaction guarantees between Redis and PostgresSQL + (vimp) Should redis only be used for decrementing stock or is there a way where we can store stock decrement + hold with a TTL and when that hold expires the redis stock can be auto-incremented avoiding or atleast reducing the dependency on worker
5. For order flow -> Suppose server dies after postres row is inserted but user/frontend does not receive response - Will need to handle retries ???
6. Same as for order flow What happens when server dies before user/frontend receives response
7. The worker will check for expired rows in postgres for finding out expired holds , right ???
8. What if the redis node dies ??? Let's say I use multiple redis nodes but then how will I handle concurrent bookings under contention ???
