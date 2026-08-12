import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ data: { service: "fuel10", status: "ok" }, error: null });
}
