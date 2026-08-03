import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

//Single source of truth for cookie attributes.
//Express matches cookies for deletion on name + path + domain, so clearCookie()
//must be handed exactly the same options cookie() was, or the browser silently
//keeps the old cookie and logout does nothing visible.
function baseCookieOptions(config: ConfigService): CookieOptions {
    const secure = config.get<string>('COOKIE_SECURE')
        ? config.get<string>('COOKIE_SECURE') === 'true'
        : config.get<string>('NODE_ENV') === 'production';

    return {
        httpOnly: true,
        secure,
        sameSite: config.get<string>('COOKIE_SAMESITE', 'lax') as CookieOptions['sameSite'],
        path: '/',
        //Must be undefined rather than '' - an empty string produces a malformed Domain=
        domain: config.get<string>('COOKIE_DOMAIN') || undefined,
    };
}

export function accessCookieMaxAge(config: ConfigService): number {
    return accessTokenSeconds(config) * 1000;
}

export function refreshTokenDays(config: ConfigService): number {
    const days = Number(config.get<string>('REFRESH_TOKEN_EXPIRES_DAYS', '30'));
    return Number.isFinite(days) && days > 0 ? days : 30;
}

//Parses the '15m' / '900s' / '2h' style value the JWT module uses, so the access
//cookie's Max-Age cannot drift away from the token's own exp claim.
function accessTokenSeconds(config: ConfigService): number {
    const raw = config.get<string>('JWT_ACCESS_EXPIRES', '15m').trim();
    const match = /^(\d+)([smhd])?$/.exec(raw);
    if (!match) {
        return 15 * 60;
    }
    const value = Number(match[1]);
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? 's'] ?? 1;
    return value * multiplier;
}

export function setAuthCookies(res: Response, config: ConfigService, accessToken: string, refreshToken: string) {
    const base = baseCookieOptions(config);
    res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: accessCookieMaxAge(config) });
    res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: refreshTokenDays(config) * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response, config: ConfigService) {
    const base = baseCookieOptions(config);
    res.clearCookie(ACCESS_COOKIE, base);
    res.clearCookie(REFRESH_COOKIE, base);
}
