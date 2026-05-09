import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { validate } from '../middleware/validate';
import { registerSchema } from '../schemas/auth.schema';

import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '../utils/jwt';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();


const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
};

function setAuthCookies(res: Response, userId: string) {
    const accessToken = signAccessToken({ userId });
    const refreshToken = signRefreshToken({ userId });

    res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}

router.post('/register', validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const existingUser = await UserModel.findOne({ email });

      if (existingUser) {
        res.status(409).json({
          message: 'User with this email already exists',
        });
        return;
      }

      const user = await UserModel.create({
        email,
        passwordHash: password,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login', validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {email, password} = req.body;
        const user = await UserModel.findOne({ email });

        if(!user) {
            res.status(401).json({
                message: 'Invalid email or password',
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if(!isPasswordValid) {
            res.status(401).json({
                message: 'Invalid email or password',
            });
            return;
        }

        setAuthCookies(res, user._id.toString());

        res.status(200).json({
            message: 'Login successful',
            user,
        });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/refresh', async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if(!refreshToken) {
        res.status(401).json({
            message: 'Unauthorized',
        });
        return;
    }

    try {
        const payload = verifyToken(refreshToken);

        setAuthCookies(res, payload.userId);

        res.status(200).json({
            message: 'Tokens refreshed successfully',
        });
    } catch {
        res.status(401).json({
            message: 'Unauthorized',
        });
    }
});

router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    res.status(200).json({
        message: 'Logout successful',
        });
    });

export default router;