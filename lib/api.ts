import { NextResponse } from "next/server";

import type { ApiResponse } from "@/types/finance";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}
