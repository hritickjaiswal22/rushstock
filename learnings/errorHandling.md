https://chat.deepseek.com/a/chat/s/51c858aa-eb96-4e7c-bb72-5e9c141ca774

# How to use asyncHandler

The asyncHandler utility is designed to remove repetitive try/catch blocks in controllers and automatically forward any rejected promises to Express’s error‑handling middleware.

```
// controllers/userController.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { UserService } from '../services/userService';

const userService = new UserService();

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  // Service might throw NotFoundError
  const user = await userService.getUserById(userId);
  return ApiResponse.success(res, user, 'User fetched successfully');
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const userData = req.body;
  // Service might throw ValidationError
  const newUser = await userService.createUser(userData);
  return ApiResponse.created(res, newUser, 'User created successfully');
});

And inside services import error type and literally `throw` that error
```

What happens when an error is thrown?

    Inside the controller, the await call rejects (because the service threw an error).

    The asyncHandler catches the rejection via Promise.catch(next).

    The error is passed to Express’s global error handler (errorHandler middleware).

    The global handler formats and sends the response.
