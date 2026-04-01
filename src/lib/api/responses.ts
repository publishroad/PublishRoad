import { NextResponse } from "next/server";

export type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccessPayload<T extends Record<string, unknown> = Record<string, never>> = {
  success: true;
} & T;

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json<ApiErrorPayload>(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

export function apiSuccess<T extends Record<string, unknown> = Record<string, never>>(payload?: T) {
  return NextResponse.json<ApiSuccessPayload<T>>({
    success: true,
    ...(payload ?? ({} as T)),
  });
}
